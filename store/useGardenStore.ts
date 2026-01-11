import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Plant } from '@/lib/garden.types';

interface GardenState {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, updated: Partial<Plant>) => void;
  deletePlant: (id: string) => void;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      plants: [],
      addPlant: (plant) => set((state) => ({ plants: [plant, ...state.plants] })),
      updatePlant: (id, updated) => set((state) => ({
        plants: state.plants.map((p) => (p.id === id ? { ...p, ...updated } : p))
      })),
      deletePlant: (id) => set((state) => ({ plants: state.plants.filter((p) => p.id !== id) })),
    }),
    { name: 'flora-garden-storage' }
  )
);