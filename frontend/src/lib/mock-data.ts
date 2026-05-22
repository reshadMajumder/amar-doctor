
export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  reviews: number;
  fee: string;
  availability: string;
  imageUrl: string;
  languages: string[];
  location: string;
  bmdcNumber?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  doctorId: string;
  patientName: string;
  date: string;
  time: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending Approval';
  type: 'Video Call' | 'Chat';
  fee: string;
  notes?: string;
  aiReportId?: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instruction: string;
  }[];
  advice: string;
  isFinalized: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit';
  amount: string;
  description: string;
  date: string;
  status: 'Success' | 'Pending' | 'Failed';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'appointment' | 'payment' | 'system' | 'report';
}

export const DOCTORS: Doctor[] = [
  {
    id: '1',
    name: 'Dr. Ariful Islam',
    specialization: 'General Physician',
    experience: '12 Years',
    rating: 4.8,
    reviews: 120,
    fee: '৳ 300',
    availability: 'Available Today',
    imageUrl: 'https://picsum.photos/seed/doc1/400/400',
    languages: ['Bengali', 'English'],
    location: 'Dhaka',
    bmdcNumber: 'BMDC-123456',
  },
  {
    id: '2',
    name: 'Dr. Nusrat Jahan',
    specialization: 'Pediatrics',
    experience: '8 Years',
    rating: 4.9,
    reviews: 85,
    fee: '৳ 400',
    availability: 'Next available Tomorrow',
    imageUrl: 'https://picsum.photos/seed/doc2/400/400',
    languages: ['Bengali', 'English'],
    location: 'Chittagong',
    bmdcNumber: 'BMDC-789012',
  },
  {
    id: '3',
    name: 'Dr. Kamal Ahmed',
    specialization: 'Cardiology',
    experience: '15 Years',
    rating: 4.7,
    reviews: 210,
    fee: '৳ 600',
    availability: 'Available Monday',
    imageUrl: 'https://picsum.photos/seed/doc3/400/400',
    languages: ['Bengali'],
    location: 'Sylhet',
    bmdcNumber: 'BMDC-345678',
  },
];

export const CONSULTATIONS: Appointment[] = [
  {
    id: 'c1',
    doctorName: 'Dr. Ariful Islam',
    doctorId: '1',
    patientName: 'Ariful',
    date: '20 May 2026',
    time: '10:30 AM',
    status: 'Upcoming',
    type: 'Video Call',
    fee: '৳ 300',
  },
  {
    id: 'c2',
    doctorName: 'Dr. Nusrat Jahan',
    doctorId: '2',
    patientName: 'Rahima Khatun',
    date: '21 May 2026',
    time: '02:15 PM',
    status: 'Pending Approval',
    type: 'Chat',
    fee: '৳ 400',
    notes: 'Severe cough for 3 days',
  },
  {
    id: 'c3',
    doctorName: 'Dr. Kamal Ahmed',
    doctorId: '3',
    patientName: 'Abdur Rahman',
    date: '22 May 2026',
    time: '11:00 AM',
    status: 'Pending Approval',
    type: 'Video Call',
    fee: '৳ 600',
  },
];

export const PRESCRIPTIONS: Prescription[] = [
  {
    id: 'p1',
    appointmentId: 'c1',
    doctorName: 'Dr. Ariful Islam',
    date: '15 Oct 2023',
    diagnosis: 'Common Cold & Seasonal Fever',
    medicines: [
      {
        name: 'Napa Extend',
        dosage: '665mg',
        frequency: '1+0+1',
        duration: '5 days',
        instruction: 'After meals',
      },
      {
        name: 'Fexo 120',
        dosage: '120mg',
        frequency: '0+0+1',
        duration: '7 days',
        instruction: 'Before sleep',
      },
    ],
    advice: 'Drink plenty of warm water. Complete rest for 3 days.',
    isFinalized: true,
  },
];

export const TRANSACTIONS: WalletTransaction[] = [
  {
    id: 't1',
    type: 'Debit',
    amount: '৳ 300',
    description: 'Consultation Fee - Dr. Ariful Islam',
    date: '15 Oct 2023',
    status: 'Success',
  },
  {
    id: 't2',
    type: 'Credit',
    amount: '৳ 1000',
    description: 'Added via bKash',
    date: '10 Oct 2023',
    status: 'Success',
  },
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Nusrat Jahan is confirmed for tomorrow at 2:15 PM.',
    time: '2 hours ago',
    isRead: false,
    type: 'appointment',
  },
  {
    id: 'n2',
    title: 'Payment Successful',
    message: 'Payment of ৳ 400 for your consultation was successful.',
    time: '5 hours ago',
    isRead: true,
    type: 'payment',
  },
  {
    id: 'n3',
    title: 'Prescription Ready',
    message: 'Dr. Ariful Islam has uploaded your prescription.',
    time: '1 day ago',
    isRead: true,
    type: 'report',
  },
];
