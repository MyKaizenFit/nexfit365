import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
from accounts.models import CustomUser


@pytest.mark.django_db
class ProgressPhotoModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.today = timezone.now().date()
    
    def test_create_progress_photo(self):
        """Test crear una foto de progreso válida"""
        photo = ProgressPhoto.objects.create(
            user=self.user,
            photo_type="front",
            date=self.today,
            weight=Decimal("70.5"),
            notes="Test photo"
        )
        
        self.assertEqual(photo.user, self.user)
        self.assertEqual(photo.photo_type, "front")
        self.assertEqual(photo.date, self.today)
        self.assertEqual(photo.weight, Decimal("70.5"))
        self.assertEqual(photo.notes, "Test photo")
        self.assertFalse(photo.is_expired)
    
    def test_future_date_validation(self):
        """Test que no se permitan fechas futuras"""
        future_date = self.today + timedelta(days=1)
        
        with self.assertRaises(ValidationError):
            photo = ProgressPhoto(
                user=self.user,
                photo_type="front",
                date=future_date
            )
            photo.full_clean()
    
    def test_unique_constraint(self):
        """Test que no se permitan fotos duplicadas del mismo tipo en la misma fecha"""
        ProgressPhoto.objects.create(
            user=self.user,
            photo_type="front",
            date=self.today
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            ProgressPhoto.objects.create(
                user=self.user,
                photo_type="front",
                date=self.today
            )
    
    def test_str_representation(self):
        """Test la representación string del modelo"""
        photo = ProgressPhoto.objects.create(
            user=self.user,
            photo_type="side",
            date=self.today
        )
        
        expected = f"{self.user.email} - side - {self.today}"
        self.assertEqual(str(photo), expected)


@pytest.mark.django_db
class WeightEntryModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.today = timezone.now().date()
    
    def test_create_weight_entry(self):
        """Test crear una entrada de peso válida"""
        entry = WeightEntry.objects.create(
            user=self.user,
            weight=Decimal("75.2"),
            date=self.today,
            notes="Morning weight"
        )
        
        self.assertEqual(entry.user, self.user)
        self.assertEqual(entry.weight, Decimal("75.2"))
        self.assertEqual(entry.date, self.today)
        self.assertEqual(entry.notes, "Morning weight")
    
    def test_future_date_validation(self):
        """Test que no se permitan fechas futuras"""
        future_date = self.today + timedelta(days=1)
        
        with self.assertRaises(ValidationError):
            entry = WeightEntry(
                user=self.user,
                weight=Decimal("75.0"),
                date=future_date
            )
            entry.full_clean()
    
    def test_unique_constraint(self):
        """Test que no se permitan entradas duplicadas en la misma fecha"""
        WeightEntry.objects.create(
            user=self.user,
            weight=Decimal("75.0"),
            date=self.today
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            WeightEntry.objects.create(
                user=self.user,
                weight=Decimal("74.8"),
                date=self.today
            )
    
    def test_str_representation(self):
        """Test la representación string del modelo"""
        entry = WeightEntry.objects.create(
            user=self.user,
            weight=Decimal("75.0"),
            date=self.today
        )
        
        expected = f"{self.user.email} - 75.0kg - {self.today}"
        self.assertEqual(str(entry), expected)


@pytest.mark.django_db
class BodyMeasurementModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.today = timezone.now().date()
    
    def test_create_body_measurement(self):
        """Test crear medidas corporales válidas"""
        measurement = BodyMeasurement.objects.create(
            user=self.user,
            date=self.today,
            chest=Decimal("95.0"),
            waist=Decimal("80.0"),
            arms=Decimal("35.0"),
            notes="Monthly measurements"
        )
        
        self.assertEqual(measurement.user, self.user)
        self.assertEqual(measurement.chest, Decimal("95.0"))
        self.assertEqual(measurement.waist, Decimal("80.0"))
        self.assertEqual(measurement.arms, Decimal("35.0"))
        self.assertEqual(measurement.notes, "Monthly measurements")
    
    def test_future_date_validation(self):
        """Test que no se permitan fechas futuras"""
        future_date = self.today + timedelta(days=1)
        
        with self.assertRaises(ValidationError):
            measurement = BodyMeasurement(
                user=self.user,
                date=future_date,
                chest=Decimal("95.0")
            )
            measurement.full_clean()
    
    def test_at_least_one_measurement_required(self):
        """Test que al menos una medida debe estar presente"""
        with self.assertRaises(ValidationError):
            measurement = BodyMeasurement(
                user=self.user,
                date=self.today
            )
            measurement.full_clean()
    
    def test_unique_constraint(self):
        """Test que no se permitan medidas duplicadas en la misma fecha"""
        BodyMeasurement.objects.create(
            user=self.user,
            date=self.today,
            chest=Decimal("95.0")
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            BodyMeasurement.objects.create(
                user=self.user,
                date=self.today,
                waist=Decimal("80.0")
            )
    
    def test_str_representation(self):
        """Test la representación string del modelo"""
        measurement = BodyMeasurement.objects.create(
            user=self.user,
            date=self.today,
            chest=Decimal("95.0")
        )
        
        expected = f"{self.user.email} - {self.today}"
        self.assertEqual(str(measurement), expected) 