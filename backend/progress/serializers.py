from rest_framework import serializers
from .models import ProgressPhoto, WeightEntry, BodyMeasurement, DailyWellness


class ProgressPhotoSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    photo_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgressPhoto
        fields = [
            "id", "user", "photo", "photo_url", "thumbnail_url", "photo_type", 
            "date", "weight", "notes", "measurements", "created_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def create(self, validated_data):
        """Override del método create para agregar logging y registrar peso"""
        import logging
        from decimal import Decimal
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Creando ProgressPhoto con datos: {validated_data}")
        logger.info(f"🔍 Usuario del contexto: {self.context.get('request').user.email}")
        
        try:
            # Agregar el usuario del request
            user = self.context['request'].user
            validated_data['user'] = user
            logger.info(f"🔍 Datos finales para crear: {validated_data}")
            
            instance = super().create(validated_data)
            logger.info(f"✅ ProgressPhoto creado exitosamente: ID={instance.id}")
            
            # Si la foto tiene peso, también crear una entrada en el historial de peso
            if instance.weight and instance.weight > 0:
                try:
                    # Verificar si ya existe una entrada de peso para esta fecha
                    existing_entry = WeightEntry.objects.filter(
                        user=user,
                        date=instance.date,
                        weight=instance.weight
                    ).first()
                    
                    if not existing_entry:
                        weight_entry = WeightEntry.objects.create(
                            user=user,
                            weight=Decimal(str(instance.weight)),
                            date=instance.date,
                            notes=f"Peso registrado con foto de progreso"
                        )
                        logger.info(f"✅ Entrada de peso creada automáticamente: {weight_entry.weight} kg")
                        
                        # Actualizar peso actual en UserStats
                        from dashboard.models import UserStats
                        stats, _ = UserStats.objects.get_or_create(user=user)
                        stats.current_weight = instance.weight
                        stats.save()
                        logger.info(f"✅ UserStats actualizado con peso: {instance.weight} kg")
                        
                        # IMPORTANTE: Actualizar también el peso en el perfil del usuario
                        user.weight = instance.weight
                        user.save(update_fields=['weight'])
                        logger.info(f"✅ Peso del usuario actualizado: {instance.weight} kg")
                except Exception as weight_error:
                    logger.warning(f"⚠️ No se pudo crear entrada de peso automática: {weight_error}")
            
            return instance
        except Exception as e:
            logger.error(f"❌ Error creando ProgressPhoto: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
    
    def validate_photo_type(self, value):
        """Validar que el tipo de foto sea válido"""
        valid_types = ['front', 'back', 'side', 'other']
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Tipo de foto inválido. Valores permitidos: {', '.join(valid_types)}"
            )
        return value
    
    def validate_weight(self, value):
        """Validar que el peso sea válido si se proporciona"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("El peso debe ser mayor a 0")
        return value
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                url = request.build_absolute_uri(obj.photo.url)
                # Forzar HTTPS en producción
                if "api.nexfit365" in url:
                    url = url.replace("http://", "https://")
                return url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get("request")
            if request:
                url = request.build_absolute_uri(obj.thumbnail.url)
                # Forzar HTTPS en producción
                if "api.nexfit365" in url:
                    url = url.replace("http://", "https://")
                return url
        return None
    
    def validate_photo(self, value):
        try:
            # Log para debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"🔍 Validando foto: {type(value)} - {value}")
            
            # Si es una lista, tomar el primer elemento
            if isinstance(value, list):
                if len(value) == 0:
                    raise serializers.ValidationError("No se proporcionó ningún archivo")
                value = value[0]
                logger.info(f"🔍 Tomando primer archivo de la lista: {value}")
            
            # Validar que sea un archivo
            if not hasattr(value, 'size') or not hasattr(value, 'content_type'):
                logger.error(f"❌ El valor no es un archivo válido: {type(value)}")
                raise serializers.ValidationError("El campo photo debe ser un archivo válido")
            
            # Validar tamaño del archivo
            from django.conf import settings
            if value.size > settings.MAX_PROGRESS_PHOTO_SIZE:
                raise serializers.ValidationError(
                    f"El archivo es demasiado grande. Tamaño máximo: {settings.MAX_PROGRESS_PHOTO_SIZE // (1024*1024)}MB"
                )
            
            # Validar tipo de archivo
            allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
            logger.info(f"🔍 Tipo de archivo recibido: {value.content_type}")
            logger.info(f"🔍 Tipos permitidos: {allowed_types}")
            
            if value.content_type not in allowed_types:
                # También verificar por extensión del archivo
                file_extension = value.name.lower().split('.')[-1] if '.' in value.name else ''
                allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
                
                logger.info(f"🔍 Extensión del archivo: {file_extension}")
                logger.info(f"🔍 Extensiones permitidas: {allowed_extensions}")
                
                if file_extension not in allowed_extensions:
                    raise serializers.ValidationError(
                        f"Tipo de archivo no permitido. Recibido: {value.content_type}, extensión: {file_extension}. "
                        f"Tipos permitidos: {', '.join(allowed_types)}"
                    )
                else:
                    logger.info(f"✅ Archivo aceptado por extensión: {file_extension}")
            else:
                logger.info(f"✅ Archivo aceptado por content_type: {value.content_type}")
            
            logger.info(f"✅ Foto validada correctamente: {value.name} ({value.size} bytes)")
            return value
        except Exception as e:
            # Log del error para debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ Error validando foto: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            raise serializers.ValidationError(f"Error validando archivo: {str(e)}")


class WeightEntrySerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    
    class Meta:
        model = WeightEntry
        fields = ["id", "user", "weight", "date", "notes", "created_at"]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def to_representation(self, instance):
        """Convertir Decimal a float para la serialización JSON"""
        representation = super().to_representation(instance)
        # Convertir weight de Decimal/string a float
        if 'weight' in representation and representation['weight'] is not None:
            try:
                from decimal import Decimal
                if isinstance(instance.weight, Decimal):
                    representation['weight'] = float(instance.weight)
                elif isinstance(representation['weight'], str):
                    representation['weight'] = float(representation['weight'])
            except (ValueError, TypeError):
                # Si no se puede convertir, dejarlo como está
                pass
        return representation
    
    def create(self, validated_data):
        """Crear entrada de peso con usuario del request"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Serializer create llamado con datos: {validated_data}")
        logger.info(f"🔍 Tipos de datos: {[(k, type(v)) for k, v in validated_data.items()]}")
        logger.info(f"🔍 Usuario del contexto: {self.context.get('request').user.email}")
        
        try:
            user = self.context['request'].user
            
            # Asegurar que el peso sea Decimal
            if 'weight' in validated_data:
                from decimal import Decimal
                validated_data['weight'] = Decimal(str(validated_data['weight']))
                logger.info(f"🔍 Peso convertido a Decimal: {validated_data['weight']}")
            
            # Verificar si es el primer peso registrado y guardarlo como peso inicial
            from dashboard.models import UserStats
            from django.utils import timezone
            existing_entries = WeightEntry.objects.filter(user=user).count()
            if existing_entries == 0:
                # Es el primer peso, guardarlo como peso inicial
                stats, created = UserStats.objects.get_or_create(
                    user=user,
                    defaults={
                        'starting_weight': validated_data['weight'],
                        'current_weight': validated_data['weight'],
                        'transformation_start_date': validated_data.get('date', timezone.now().date()),
                    }
                )
                if not created and not stats.starting_weight:
                    # Si ya existe UserStats pero no tiene peso inicial, actualizarlo
                    stats.starting_weight = validated_data['weight']
                    stats.current_weight = validated_data['weight']
                    if not stats.transformation_start_date:
                        stats.transformation_start_date = validated_data.get('date', timezone.now().date())
                    stats.save()
                
                # Actualizar peso del usuario también
                user.weight = validated_data['weight']
                user.save(update_fields=['weight'])
                logger.info(f"✅ Peso inicial guardado: {validated_data['weight']} kg")
            else:
                # Actualizar peso actual en UserStats
                stats, created = UserStats.objects.get_or_create(user=user)
                stats.current_weight = validated_data['weight']
                stats.save()
            
            # IMPORTANTE: Actualizar también el peso en el perfil del usuario para mantener sincronizado
            user.weight = validated_data['weight']
            user.save(update_fields=['weight'])
            logger.info(f"✅ Peso del usuario actualizado: {validated_data['weight']} kg")
            
            # Crear la entrada sin validación adicional
            entry = WeightEntry.objects.create(
                user=user,
                weight=validated_data['weight'],
                date=validated_data['date'],
                notes=validated_data.get('notes', '')
            )
            logger.info(f"✅ Entrada creada exitosamente: {entry}")
            return entry
        except Exception as e:
            logger.error(f"❌ Error en serializer create: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
    
    def validate_weight(self, value):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 Validando peso: {value} (tipo: {type(value)})")
        
        # Convertir a Decimal si es necesario
        try:
            from decimal import Decimal
            if isinstance(value, (int, float)):
                value = Decimal(str(value))
            elif isinstance(value, str):
                value = Decimal(value)
            elif not isinstance(value, Decimal):
                raise serializers.ValidationError("El peso debe ser un número válido")
        except (ValueError, TypeError) as e:
            logger.error(f"❌ Error convirtiendo peso: {str(e)}")
            raise serializers.ValidationError("El peso debe ser un número válido")
        
        if value <= 0:
            logger.error(f"❌ Peso inválido: {value}")
            raise serializers.ValidationError("El peso debe ser mayor a 0")
        
        logger.info(f"✅ Peso válido: {value} (tipo: {type(value)})")
        return value
    
    def validate_date(self, value):
        """Validar que la fecha no sea en el futuro"""
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("La fecha no puede ser en el futuro")
        return value


class BodyMeasurementSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    
    class Meta:
        model = BodyMeasurement
        fields = [
            "id", "user", "date", "chest", "waist", "hips", "arms", 
            "thighs", "neck", "forearms", "calves", "notes", "created_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def validate(self, data):
        # Al menos una medida debe estar presente
        measurement_fields = [
            "chest", "waist", "hips", "arms", 
            "thighs", "neck", "forearms", "calves"
        ]
        
        if not any(data.get(field) for field in measurement_fields):
            raise serializers.ValidationError(
                "Al menos una medida debe estar presente"
            )
        
        return data


class ProgressSummarySerializer(serializers.Serializer):
    """Serializer para resumen de progreso"""
    total_photos = serializers.IntegerField()
    total_weight_entries = serializers.IntegerField()
    total_measurements = serializers.IntegerField()
    latest_weight = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    latest_weight_date = serializers.DateField(allow_null=True)
    weight_change = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    weight_change_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    photos_this_month = serializers.IntegerField()
    weight_entries_this_month = serializers.IntegerField()


class DailyWellnessSerializer(serializers.ModelSerializer):
    """Serializer para registro diario de bienestar (sueño y motivación)"""
    user = serializers.ReadOnlyField(source="user.email")
    
    class Meta:
        model = DailyWellness
        fields = [
            "id", "user", "date", "sleep_hours", "motivation_score", 
            "notes", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def create(self, validated_data):
        """Crear registro de bienestar con usuario del request"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data) 