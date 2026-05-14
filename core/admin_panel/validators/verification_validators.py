from rest_framework import serializers
import re

class DoctorVerificationValidator:
    """
    Custom validators for doctor verification data.
    """
    
    @staticmethod
    def validate_bmdc_number(value):
        """
        Validates BMDC registration number format (example: A-12345).
        """
        pattern = r'^[A-Z]-\d{4,6}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("BMDC number must be in format 'X-12345'.")
        return value

    @staticmethod
    def validate_document_completeness(profile):
        """
        Checks if all required documents are uploaded.
        """
        if not profile.documents:
            raise serializers.ValidationError("Required verification documents are missing.")
        return True
