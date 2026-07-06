from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import RestWellnessAssessment
from .rest_wellness_access import can_access_rest_wellness, can_coach_rest_wellness
from .rest_wellness_content import (
    TOTAL_QUESTIONS,
    build_script,
    compute_scores,
    get_questions_payload,
)
from .rest_wellness_permissions import CanAccessRestWellness, CanCoachRestWellness
from .serializers import (
    RestWellnessAssessmentCreateSerializer,
    RestWellnessAssessmentDetailSerializer,
    RestWellnessAssessmentListSerializer,
)


class RestWellnessViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RestWellnessAssessment.objects.select_related("user").all()

    def get_permissions(self):
        if self.action in {"access"}:
            return [IsAuthenticated()]
        if self.action in {"questions", "create"}:
            return [IsAuthenticated(), CanAccessRestWellness()]
        return [IsAuthenticated(), CanCoachRestWellness()]

    @action(detail=False, methods=["get"], url_path="access")
    def access(self, request):
        can_fill = can_access_rest_wellness(request.user)
        return Response({
            "can_fill": can_fill,
            "can_coach": can_coach_rest_wellness(request.user) if can_fill else False,
        })

    @action(detail=False, methods=["get"], url_path="questions")
    def questions(self, request):
        return Response(get_questions_payload())

    def list(self, request):
        queryset = self.get_queryset().order_by("-created_at")
        serializer = RestWellnessAssessmentListSerializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        assessment = self.get_object()
        serializer = RestWellnessAssessmentDetailSerializer(assessment)
        return Response(serializer.data)

    def create(self, request):
        serializer = RestWellnessAssessmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers = serializer.validated_data["answers"]
        if len(answers) != TOTAL_QUESTIONS:
            return Response(
                {"detail": f"Se esperaban {TOTAL_QUESTIONS} respuestas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            scores = compute_scores(answers)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        display_name = request.user.get_full_name().strip() or request.user.first_name or request.user.email
        script_payload = build_script(display_name, scores)

        assessment = RestWellnessAssessment.objects.create(
            user=request.user,
            answers=answers,
            scores=scores,
            script=script_payload["text"],
            top_categories=script_payload["top_categories"],
        )

        return Response(
            RestWellnessAssessmentDetailSerializer(assessment).data,
            status=status.HTTP_201_CREATED,
        )
