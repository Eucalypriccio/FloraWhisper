'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Navbar from '@/components/overlay/Navbar';
import GardenBackground from '@/components/overlay/GardenBackground'; 
import PlantWizard from '@/components/garden/PlantWizard';
import PlantCardEnhanced from '@/components/garden/PlantCardEnhanced';
import WeatherStation from '@/components/garden/WeatherStation';
import GardenAdviceBoard from '@/components/garden/GardenAdviceBoard'; // 1. 引入组件
import { useGardenStore } from '@/store/useGardenStore';
import { Plant } from '@/lib/garden.types';

export default function GardenPage() {
  const { plants } = useGardenStore();
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | undefined>(undefined);

  const handleOpenNew = () => {
    setEditingPlant(undefined);
    setWizardOpen(true);
  };

  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant);
    setWizardOpen(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GardenBackground />
      <Navbar />

      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <header className="mb-12 animate-fade-in">
           <h1 className="font-serif text-4xl text-flora-dark">My Tranquil Garden</h1>
           <p className="text-flora-dark/60 mt-2">Manage your digital sanctuary.</p>
        </header>

        <div className="animate-fade-in">
            <WeatherStation />
            <GardenAdviceBoard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {plants.map(plant => (
                <PlantCardEnhanced 
                    key={plant.id} 
                    plant={plant} 
                    onClick={() => handleEdit(plant)}
                />
            ))}
            
            <button 
              onClick={handleOpenNew}
              className="group min-h-75 border-2 border-dashed border-flora-secondary/40 rounded-4xl flex flex-col items-center justify-center gap-4 text-flora-secondary hover:border-flora-primary hover:bg-flora-primary/5 hover:text-flora-primary transition-all duration-300 animate-fade-in"
            >
                <div className="w-16 h-16 rounded-full bg-flora-sprout/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                </div>
                <span className="font-serif text-lg">ADD NEW PLANT</span>
            </button>
        </div>
      </div>

      <PlantWizard 
        isOpen={isWizardOpen} 
        onClose={() => setWizardOpen(false)} 
        editTarget={editingPlant}
      />
    </div>
  );
}