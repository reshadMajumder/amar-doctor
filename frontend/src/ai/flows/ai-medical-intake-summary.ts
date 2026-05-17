'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a structured medical intake summary
 * from a patient's chat history. It extracts key information such as symptoms,
 * duration, severity, and risk level, preparing it for review by a doctor.
 *
 * - generateMedicalIntakeSummary - The primary function to call the AI flow.
 * - AiMedicalIntakeSummaryInput - The input type for the flow, comprising chat history.
 * - AiMedicalIntakeSummaryOutput - The output type for the flow, providing the structured summary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiMedicalIntakeSummaryInputSchema = z.object({
  chatHistory: z.array(
    z.object({
      role: z.enum(['patient', 'ai']),
      content: z.string().describe('The text content of the chat message.'),
    })
  ).describe('A chronological array of chat messages between the patient and the AI, forming the symptom intake conversation.'),
});
export type AiMedicalIntakeSummaryInput = z.infer<typeof AiMedicalIntakeSummaryInputSchema>;

const AiMedicalIntakeSummaryOutputSchema = z.object({
  symptomsSummary: z.string().describe('A concise textual summary of the patient\'s primary symptoms.'),
  duration: z.string().describe('The duration for which the symptoms have been present (e.g., "3 days", "2 weeks").'),
  severity: z.string().describe('The perceived severity of the symptoms (e.g., "Mild", "Moderate", "Severe").'),
  riskLevel: z.enum(['Low', 'Moderate', 'High', 'Critical']).describe('An assessment of the overall risk level based on the reported symptoms.'),
  recommendation: z.string().describe('Suggested next steps for the patient, such as "Consult a general physician" or "Seek immediate emergency care".'),
  extractedSymptoms: z.array(z.string()).describe('A list of individual key symptoms identified from the conversation.'),
  medicalSummary: z.string().describe('A detailed, structured medical intake summary suitable for a doctor\'s review, clearly outlining all relevant information extracted from the chat.'),
  emergencyWarning: z.boolean().describe('True if the symptoms suggest an immediate medical emergency, otherwise false.'),
  emergencyMessage: z.string().optional().describe('A message providing specific guidance if an emergency warning is triggered.'),
});
export type AiMedicalIntakeSummaryOutput = z.infer<typeof AiMedicalIntakeSummaryOutputSchema>;

export async function generateMedicalIntakeSummary(
  input: AiMedicalIntakeSummaryInput
): Promise<AiMedicalIntakeSummaryOutput> {
  return aiMedicalIntakeSummaryFlow(input);
}

const aiMedicalIntakeSummaryPrompt = ai.definePrompt({
  name: 'aiMedicalIntakeSummaryPrompt',
  input: { schema: AiMedicalIntakeSummaryInputSchema },
  output: { schema: AiMedicalIntakeSummaryOutputSchema },
  prompt: `You are an AI assistant specialized in medical intake for telemedicine. Your primary role is to act as an intelligent medical scribe. Analyze the provided chat history between a patient and an AI, and then generate a clear, structured medical intake summary.

This summary is NOT a diagnosis. It is intended to help medical professionals quickly understand the patient's condition for triage and consultation.

Extract the following details:
- A concise summary of the main symptoms.
- The duration of the symptoms.
- The perceived severity.
- An overall risk level (Low, Moderate, High, Critical).
- A recommendation for next steps.
- A list of specific symptoms identified.
- A detailed medical summary.
- Whether an emergency warning is needed, and if so, a message for it.

Here is the chat conversation history:
{{#each chatHistory}}
  {{#if (eq role "patient")}}Patient: {{/if}}
  {{#if (eq role "ai")}}AI: {{/if}}
  {{{content}}}
{{/each}}

Provide the output in the specified JSON format.`,
});

const aiMedicalIntakeSummaryFlow = ai.defineFlow(
  {
    name: 'aiMedicalIntakeSummaryFlow',
    inputSchema: AiMedicalIntakeSummaryInputSchema,
    outputSchema: AiMedicalIntakeSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await aiMedicalIntakeSummaryPrompt(input);
    return output!;
  }
);
