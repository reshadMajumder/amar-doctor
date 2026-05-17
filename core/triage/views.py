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

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        session = self.get_object()
        if session.status == 'completed':
            report = getattr(session, 'report', None)
            if report:
                return Response(success_response(data={"report_id": report.id}))
        
        try:
            from triage.services.report_service import ReportService
            report_service = ReportService()
            report = report_service.generate_report(session.id)
            return Response(success_response(data={"report_id": report.id}))
        except Exception as e:
            return Response(error_response(message=str(e)), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AIReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIReportSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return AIReport.objects.filter(patient=user)
        return AIReport.objects.all()
