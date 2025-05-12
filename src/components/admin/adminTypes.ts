export interface Position {
  _id: string;
  name: string;
  description?: string;
}
export interface Candidate {
  _id: string;
  name: string;
  party: string;
  position: Position | string;
  imageUrl: string;
  voteCount: number;
}
export interface KYCSubmission{
    _id: string;
    walletAddress: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    feedback?: string;
    history?: {status: string; feedback?: string; updatedAt: string}[];
}

export interface Election{
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: "upcoming" | "active" | "ended";
    candidates: Candidate[];
    votersCount: number;
    partcipantsCount: number;
}
