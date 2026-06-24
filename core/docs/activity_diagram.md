# Amar Doctor - Operational Activity Diagram

This document contains a UML Swimlane Activity Diagram showing the flow of actions across the four primary system actors: **Patient**, **Doctor**, **System (Backend / AI)**, and **Admin**.

---

## Swimlane Activity Diagram (Mermaid)

```mermaid
flowchart TB
    %% Swimlane 1: Patient
    subgraph Swimlane_Patient["Patient Swimlane"]
        P_Start([Start]) --> P_Triage[Enter Symptoms & Complete Triage]
        P_Triage --> P_Select[Select Medical Specialist & Slot]
        P_Select --> P_Pay[Authorize Gateway payment SSLCommerz]
        
        P_Chat[Join Live ChatRoom]
        P_Interact[Consult via Text/Voice/Video]
        
        P_Receive[Receive Finalized Prescription]
        P_Review{Dispute Consultation?}
        P_RaiseDispute[File Formal Dispute]
    end

    %% Swimlane 2: Doctor
    subgraph Swimlane_Doctor["Doctor Swimlane"]
        D_SetupAvailability[Set Weekday Time Slots & Breaks]
        D_JoinRoom[Join Live ChatRoom]
        D_Consult[Conduct Session & Review Triage AIReport]
        D_DraftPrescription[Draft Diagnosis & Add Medicine Items]
        D_SignPrescription[Finalize & Digitally Sign Prescription]
        D_CheckEarnings[Check Wallet Balance & Payout Status]
    end

    %% Swimlane 3: System (Backend/AI)
    subgraph Swimlane_System["System Swimlane"]
        %% Booking escrow logic
        S_VerifyPayment{Verify Payment Transaction}
        S_RefundFailed[Refund Booking Fee]
        S_EscrowHold[Deposit & Hold Funds in Escrow]
        S_ConfirmAppt[Confirm Booking & Generate ChatRoom]
        
        %% Real-time chat & WebSocket connections
        S_OpenWS[Connect WebSockets & Track Presence]
        S_SyncMsg[Deliver & Record Messages / File Attachments]
        
        %% Prescriptions deliver
        S_LockPrescription[Render Finalized Prescription PDF & Block Edits]
        
        %% Financial processing
        S_StartTimer[Start Dispute Window Timer]
        S_Payout[Deduct Platform Commission %]
        S_WalletTransfer[Credit Doctor Wallet & Platform Wallet]
        S_RefundEscrow[Credit Patient Wallet]
    end

    %% Swimlane 4: Admin
    subgraph Swimlane_Admin["Admin Swimlane"]
        A_Investigate[Review Session Logs & Dispute Details]
        A_Resolve{Dispute Decision}
    end

    %% Flow Connections between Swimlanes
    %% Onboarding availability
    D_SetupAvailability --> S_ConfirmAppt
    
    %% Triage to payment
    P_Pay --> S_VerifyPayment
    
    %% Escrow path
    S_VerifyPayment -->|Failed/Unpaid| S_RefundFailed
    S_VerifyPayment -->|Successful| S_EscrowHold
    S_RefundFailed --> P_Select
    S_EscrowHold --> S_ConfirmAppt
    S_ConfirmAppt --> S_OpenWS
    
    %% WebSocket room connections
    S_OpenWS --> P_Chat
    S_OpenWS --> D_JoinRoom
    
    P_Chat --> P_Interact
    D_JoinRoom --> D_Consult
    
    P_Interact <--> S_SyncMsg
    D_Consult <--> S_SyncMsg
    
    %% Prescription issuance
    D_Consult --> D_DraftPrescription
    D_DraftPrescription --> D_SignPrescription
    D_SignPrescription --> S_LockPrescription
    S_LockPrescription --> P_Receive
    
    %% Completion & disputes
    P_Receive --> S_StartTimer
    S_StartTimer --> P_Review
    
    P_Review -->|No Dispute / Timer Expired| S_Payout
    P_Review -->|Raise Dispute| P_RaiseDispute
    
    %% Dispute workflow
    P_RaiseDispute --> A_Investigate
    A_Investigate --> A_Resolve
    
    A_Resolve -->|Rule for Doctor| S_Payout
    A_Resolve -->|Rule for Patient| S_RefundEscrow
    
    S_Payout --> S_WalletTransfer
    S_WalletTransfer --> D_CheckEarnings
    
    S_RefundEscrow --> P_Start
    
    %% Styling
    classDef swimlane fill:none,stroke:#cfd8dc,stroke-width:2px,stroke-dasharray: 5 5;
    class Swimlane_Patient,Swimlane_Doctor,Swimlane_System,Swimlane_Admin swimlane;
```
