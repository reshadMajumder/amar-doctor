from django.urls import path, include
from rest_framework.routers import DefaultRouter
from triage.views import AITriageSessionViewSet, AIReportViewSet

router = DefaultRouter()
router.register(r'sessions', AITriageSessionViewSet, basename='triage-session')
router.register(r'reports', AIReportViewSet, basename='ai-report')

urlpatterns = [
    path('', include(router.urls)),
]
