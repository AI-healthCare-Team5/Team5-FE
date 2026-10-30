export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface MapHospital extends MapLocation {
  id: string;
  name: string;
}

export interface HospitalMapProps {
  hospitals: readonly MapHospital[];
  selectedHospitalId?: string;
  userLocation?: MapLocation;
  onSelectHospital: (id: string) => void;
}
