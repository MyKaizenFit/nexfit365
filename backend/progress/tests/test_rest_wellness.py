import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from progress.rest_wellness_access import can_access_rest_wellness
from progress.rest_wellness_content import TOTAL_QUESTIONS, build_script, compute_scores

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def pilot_user():
    return User.objects.create_user(
        email="raptoraitor32@gmail.com",
        password="PilotPass123!",
        role="MEMBER",
        first_name="Piloto",
    )


@pytest.fixture
def coach_user():
    return User.objects.create_user(
        email="contacto.sarakhalaf@gmail.com",
        password="CoachPass123!",
        role="MEMBER",
        first_name="Sara",
    )


@pytest.fixture
def member_user():
    return User.objects.create_user(
        email="member@example.com",
        password="MemberPass123!",
        role="MEMBER",
    )


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        email="staff@example.com",
        password="StaffPass123!",
        role="ADMIN",
        is_staff=True,
    )


@pytest.fixture
def test_user():
    return User.objects.create_user(
        email="test@example.invalid",
        password="TestUser123!",
        role="MEMBER",
    )


@pytest.mark.django_db
def test_can_access_pilot_and_test_users(pilot_user, coach_user, member_user, test_user, staff_user):
    assert can_access_rest_wellness(pilot_user) is True
    assert can_access_rest_wellness(coach_user) is True
    assert can_access_rest_wellness(test_user) is True
    assert can_access_rest_wellness(member_user) is False
    assert can_access_rest_wellness(staff_user) is False


@pytest.mark.django_db
def test_can_coach_only_staff_and_admin(pilot_user, coach_user, member_user, staff_user):
    from progress.rest_wellness_access import can_coach_rest_wellness

    assert can_coach_rest_wellness(pilot_user) is False
    assert can_coach_rest_wellness(coach_user) is False
    assert can_coach_rest_wellness(member_user) is False
    assert can_coach_rest_wellness(staff_user) is True


def test_shuffle_has_32_questions():
    assert TOTAL_QUESTIONS == 32


def test_all_no_scores_zero():
    answers = [False] * TOTAL_QUESTIONS
    scores = compute_scores(answers)
    assert all(score == 0 for score in scores.values())


def test_build_script_for_all_yes():
    answers = [True] * TOTAL_QUESTIONS
    scores = compute_scores(answers)
    payload = build_script("Ana", scores)
    assert "GUION PARA VIDEO PERSONALIZADO" in payload["text"]
    assert len(payload["top_categories"]) == 3


@pytest.mark.django_db
def test_access_endpoint_for_pilot(api_client, pilot_user, member_user, staff_user):
    auth_client(api_client, pilot_user)
    response = api_client.get("/api/rest-wellness/access/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["can_fill"] is True
    assert response.data["can_coach"] is False

    auth_client(api_client, staff_user)
    response = api_client.get("/api/rest-wellness/access/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["can_fill"] is False
    assert response.data["can_coach"] is True

    auth_client(api_client, member_user)
    response = api_client.get("/api/rest-wellness/access/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["can_fill"] is False
    assert response.data["can_coach"] is False


@pytest.mark.django_db
def test_member_cannot_get_questions(api_client, member_user):
    auth_client(api_client, member_user)
    response = api_client.get("/api/rest-wellness/questions/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_pilot_can_submit_staff_can_list(api_client, pilot_user, staff_user):
    auth_client(api_client, pilot_user)

    questions_response = api_client.get("/api/rest-wellness/questions/")
    assert questions_response.status_code == status.HTTP_200_OK
    assert questions_response.data["total"] == TOTAL_QUESTIONS

    answers = [False] * TOTAL_QUESTIONS
    answers[0] = True
    create_response = api_client.post(
        "/api/rest-wellness/",
        {"answers": answers},
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    assert "message" in create_response.data
    assert "script" not in create_response.data

    auth_client(api_client, pilot_user)
    list_response = api_client.get("/api/rest-wellness/")
    assert list_response.status_code == status.HTTP_403_FORBIDDEN

    auth_client(api_client, staff_user)
    list_response = api_client.get("/api/rest-wellness/")
    assert list_response.status_code == status.HTTP_200_OK
    assert len(list_response.data) == 1
    assert list_response.data[0]["name"] == "Piloto"


@pytest.mark.django_db
def test_member_cannot_submit(api_client, member_user):
    auth_client(api_client, member_user)
    response = api_client.post(
        "/api/rest-wellness/",
        {"answers": [False] * TOTAL_QUESTIONS},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
