export interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  date: string;
  product: string;
  content: string;
  color: string;
}

export const reviews: Review[] = [];
