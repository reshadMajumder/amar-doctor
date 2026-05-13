from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from triage.models import AITriageSession, AIReport
from triage.serializers import AITriageSessionSerializer, AITriageSessionDetailSerializer, AIReportSerializer
from accounts.utils.responses import success_response, error_response

class AITriageSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return AITriageSession.objects.filter(patient=user)
        # Doctors/Admins can see all sessions
        return AITriageSession.objects.all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AITriageSessionDetailSerializer
        return AITriageSessionSerializer

    def create(self, request, *args, **kwargs):
        # Allow creating a new session
        session = AITriageSession.objects.create(patient=request.user)
        serializer = self.get_serializer(session)
        return Response(success_response(data=serializer.data), status=status.HTTP_201_CREATED)

class AIReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIReportSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return AIReport.objects.filter(patient=user)
        return AIReport.objects.all()
