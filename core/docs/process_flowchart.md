# Amar Doctor - Core Process Flowchart

This document maps the end-to-end operational workflows of the **Amar Doctor** platform. It illustrates how the database entities interact across the system's lifecycles.

---

## Operational Process Flowchart (Mermaid)

```mermaid
flowchart TD
    %% Styling & Classes
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef patient fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
    classDef doctor fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px;
    classDef admin fill:#fff3e0,stroke:#ef6c00,stroke-width:1px;
    classDef system fill:#f3e5f5,stroke:#6a1b9a,stroke-width:1px;
    classDef critical fill:#ffebee,stroke:#c62828,stroke-width:2px;

    %% Subgraph 1: User Onboarding & Verification
    subgraph Onboarding["1. User Onboarding & Verification"]
        A[User Registers]:::patient --> B{Role?}:::system
        B -->|Patient| C[Access Dashboard]:::patient
        B -->|Doctor| D[Create DoctorProfile & Upload BMDC Docs]:::doctor
        D --> E[Status: Pending Verification]:::doctor
        E --> F{Admin Reviews Docs}:::admin
        F -->|Reject| G[Verification Status: Rejected]:::critical
        F -->|Approve| H[Verification Status: Approved]:::doctor
        H --> I[Set Consultation Fee & Availability]:::doctor
    end

    %% Subgraph 2: AI-Assisted Triage Session
    subgraph Triage["2. AI Symptom Triage"]
        C --> J[Start AITriageSession]:::patient
        J --> K[Submit Symptoms]:::patient
        K --> L[Gemini Prompt & Q&A Loop]:::system
        L --> M[AITriageMessage History Recorded]:::system
        M --> N[Analyze Risk Level]:::system
        N --> O[Generate AIReport]:::system
        O --> P{Emergency Detected?}:::critical
        P -->|Yes| Q[Alert Emergency Care Instantly]:::critical
        P -->|No| R[Recommend Medical Specialization]:::patient
    end

    %% Subgraph 3: Booking & Escrow Payment
    subgraph Booking["3. Appointment Booking & Escrow Payment"]
        R --> S[Search Approved Doctors & Availability]:::patient
        I --> S
        S --> T[Select Slot & Initiate Booking]:::patient
        T --> U[Create Appointment: Status 'Pending']:::patient
        U --> V[Initiate Payment Transaction via Gateway]:::patient
        V --> W{Payment Verified?}:::system
        W -->|No/Failed| X[Appointment Status: Rejected/Cancelled]:::critical
        W -->|Yes| Y[Escrow: Deposit to PatientWallet]:::system
        Y --> Z[Hold Funds: Move to Pending Balance]:::system
        Z --> AA[Update Payment: Paid Escrow]:::system
        AA --> AB[Update Appointment: Confirmed]:::system
    end

    %% Subgraph 4: Consultation & Prescribing
    subgraph Consultation["4. Live Consultation & Prescribing"]
        AB --> AC[Initiate ChatRoom & Notify Parties]:::system
        AC --> AD[Patient & Doctor Join Chat Room]:::system
        AD --> AE[Real-time Interaction Voice/Video/Text]:::system
        AE --> AF[Update Participant Connection Presence]:::system
        AE --> AG[Doctor drafts Prescription & Items]:::doctor
        AG --> AH[Doctor finalizes & signs Prescription]:::doctor
        AH --> AI[Prescription status: Finalized]:::doctor
        AI --> AJ[Post Prescription item in ChatRoom]:::system
        AJ --> AK[Doctor completes Consultation Session]:::doctor
        AK --> AL[Update Appointment: Completed]:::system
        AL --> AM[Close ChatRoom]:::system
    end

    %% Subgraph 5: Financial Settlement & Disputes
    subgraph Settlement["5. Settlement & Dispute Resolution"]
        AM --> AN{Dispute opened within window?}:::system
        
        %% Dispute Path
        AN -->|Yes| AO[Create ConsultationDispute: Status 'Open']:::patient
        AO --> AP[Hold Funds in Escrow: Payment Status 'Disputed']:::system
        AP --> AQ{Admin Investigates}:::admin
        AQ -->|Rules in favor of Patient| AR[Refund to PatientWallet Available Balance]:::patient
        AQ -->|Rules in favor of Doctor| AS[Release Payout to DoctorWallet]:::doctor
        
        %% Default Payout Path
        AN -->|No| AS
        AS --> AT[Deduct Platform Fee Commission %]:::system
        AT --> AU[Credit PlatformWallet Available Balance]:::admin
        AU --> AV[Credit DoctorWallet Available Balance]:::doctor
        AV --> AW[Update Payment: Released to Doctor]:::system
    end

    %% Apply CSS class overrides
    class A,C,J,K,R,S,T,AO,AR patient;
    class D,I,G,H,AG,AH,AK,AS,AV doctor;
    class F,AQ,AU admin;
    class B,L,M,N,O,W,Y,Z,AA,AB,AC,AD,AE,AF,AJ,AM,AN,AT,AW system;
    class G,P,Q,X critical;
