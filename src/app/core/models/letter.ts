// Información del autor de la carta
export interface UserAuthor {
  _id: string;
  username: string;     // Ej: "romancillooo"
  displayName: string;  // Ej: "Roman Barragan"
  email: string;
  role?: string;        // Ej: "superadmin" | "user"
}

export interface Reaction {
  emoji: string;
  user: {
    _id: string;
    username: string;
    displayName: string;
  };
  createdAt: string;
}

export interface Letter {
  id: string;
  title: string;
  icon: string;
  content: string;
  createdAt?: string;
  legacyId?: number;
  createdBy?: UserAuthor;
  reactions?: Reaction[];
}
