from django.urls import path
from .views import (
    PrescriptionCreateView, 
    PrescriptionDetailView, 
    PrescriptionItemAddView, 
    PrescriptionFinalizeView,
    PrescriptionPDFDownloadView,
    PatientPrescriptionListView
)

urlpatterns = [
    path('', PrescriptionCreateView.as_view(), name='prescription-create'),
    path('<int:pk>/', PrescriptionDetailView.as_view(), name='prescription-detail'),
    path('<int:pk>/items/', PrescriptionItemAddView.as_view(), name='prescription-item-add'),
    path('<int:pk>/finalize/', PrescriptionFinalizeView.as_view(), name='prescription-finalize'),
    path('<int:pk>/pdf/', PrescriptionPDFDownloadView.as_view(), name='prescription-pdf'),
    path('my-prescriptions/', PatientPrescriptionListView.as_view(), name='patient-prescriptions'),
]
