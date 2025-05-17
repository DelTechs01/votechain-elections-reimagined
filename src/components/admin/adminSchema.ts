import {z} from 'zod';

export const positionSchema = z.object({
    name: z.string().min(1, "Position name is required"),
    description: z.string().optional(),
});

export const candidateSchema = z.object({
    name: z.string().min(1, "Candidate name is required"),
    party: z.string().optional(),
    position: z.string().min(1, "Position is required"),
    imageUrl: z.string().url("Must be a valid URL").optional(),
});

export const kycUpdateSchema = z.object({
    status: z.enum(["Approved", "rejected"]),
    feedback: z.string().optional(),
});
export const electionSchema = z.object({
    title: z.string().min(1, "Election title is required"),
    description: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)),{message: "Invalid start date"}),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)),{message: "Invalid end date"}),
    candidateIds: z.array(z.string()).min(1, "At least one candidate is required"),
})