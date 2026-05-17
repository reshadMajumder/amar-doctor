'use server';
/**
 * @fileOverview An AI assistant flow for conversational symptom triage.
 *
 * - aiSymptomTriageChat - A function that handles the AI symptom triage conversation.
 * - AISymptomTriageChatInput - The input type for the aiSymptomTriageChat function.
 * - AISymptomTriageChatOutput - The return type for the aiSymptomTriageChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISymptomTriageChatInputSchema = z.object({
  message: z.string().describe('The current message from the patient.'),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .describe('A history of previous messages in the conversation to maintain context.')
    .default([]),
});
export type AISymptomTriageChatInput = z.infer<typeof AISymptomTriageChatInputSchema>;

const AISymptomTriageChatOutputSchema = z.object({
  response: z.string().describe('The AI\'s conversational response.'),
});
export type AISymptomTriageChatOutput = z.infer<typeof AISymptomTriageChatOutputSchema>;

export async function aiSymptomTriageChat(input: AISymptomTriageChatInput): Promise<AISymptomTriageChatOutput> {
  return aiSymptomTriageChatFlow(input);
}

const aiSymptomTriageChatPrompt = ai.definePrompt({
  name: 'aiSymptomTriageChatPrompt',
  input: {schema: AISymptomTriageChatInputSchema},
  output: {schema: AISymptomTriageChatOutputSchema},
  prompt: `You are GraminDoc AI, a compassionate and helpful AI assistant for telemedicine symptom triage in rural Bangladesh. Your goal is to gently guide patients through a series of questions to understand their symptoms, without providing any diagnosis or medical advice. Focus on gathering clear, concise information about the patient's condition.

Be empathetic, use simple language, and avoid medical jargon. Ask one to two clear follow-up questions at a time to gather details about:
- What symptoms are they experiencing?
- Where is the symptom located?
- When did it start (duration)?
- How severe is it (on a scale of 1-10)?
- What makes it better or worse?
- Any other related symptoms or past medical history.

Maintain a conversational tone. Do not provide medical interpretations or suggest treatments. Always remind the user that this is an intake process and a doctor will review their full information.

{{#each chatHistory}}
  {{this.role}}: {{this.content}}
{{/each}}
Patient: {{{message}}}
AI: `,
});

const aiSymptomTriageChatFlow = ai.defineFlow(
  {
    name: 'aiSymptomTriageChatFlow',
    inputSchema: AISymptomTriageChatInputSchema,
    outputSchema: AISymptomTriageChatOutputSchema,
  },
  async input => {
    const {output} = await aiSymptomTriageChatPrompt(input);
    return output!;
  }
);
