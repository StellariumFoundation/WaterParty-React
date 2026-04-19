export interface User {
  ID: string;
  RealName: string;
  Email: string;
  PhoneNumber: string;
  ProfilePhotos: string[];
  Age: number;
  HeightCm: number;
  Gender: string;
  Bio: string;
  JobTitle: string;
  Company: string;
  School: string;
  Degree: string;
  Instagram?: string;
  Twitter?: string;
  TrustScore: number;
  Thumbnail: string;
}

export interface Party {
  ID: string;
  HostID: string;
  Title: string;
  Description: string;
  PartyPhotos: string[];
  StartTime: string;
  DurationHours: number;
  Status: string;
  Address: string;
  City: string;
  GeoLat: number;
  GeoLon: number;
  MaxCapacity: number;
  CurrentGuestCount: number;
  VibeTags: string[];
  Rules: string[];
  ChatRoomID: string;
  Thumbnail: string;
  CrowdfundTarget?: number;
  CrowdfundCurrent?: number;
  PartyType?: string;
}

export interface ChatRoom {
  ID: string;
  PartyID: string;
  Title: string;
  ImageUrl: string;
  RecentMessages: any[];
  IsGroup: boolean;
  ParticipantIDs: string[];
}
