'use client';
import { useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactNode } from 'react';
import { X, Upload, Sun, Droplets, Sprout, Check, ChevronRight, Trash2 } from 'lucide-react';
import { useGardenStore } from '@/store/useGardenStore';
import { Plant, PlantType, LightLevel, MoistureLevel, SPECIES_DATA } from '@/lib/garden.types';
import clsx from 'clsx';
import Image from 'next/image';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: Plant;
}

export default function PlantWizard({ isOpen, onClose, editTarget }: Props) {
  if (!isOpen) return null;

  // 关键点：把所有 state 放到 WizardContent 里，并用 key 强制在切换编辑对象时重置。
  const contentKey = editTarget?.id ?? 'new';
  return <WizardContent key={contentKey} onClose={onClose} editTarget={editTarget} />;
}

function WizardContent({ onClose, editTarget }: { onClose: () => void; editTarget?: Plant }) {
  const { addPlant, updatePlant, deletePlant } = useGardenStore();
  const [step, setStep] = useState<1 | 2>(1);

  const makeGuideSignature = (input: {
    formalName: string;
    type: PlantType | '';
  }) => {
    const normalizedFormalName = input.formalName.trim();
    const normalizedType = input.type;
    return `${normalizedType}||${normalizedFormalName}`;
  };
  
  // --- 表单状态 ---
  const [name, setName] = useState(editTarget?.name || '');
  const [formalName, setFormalName] = useState(editTarget?.formalName || '');
  const [type, setType] = useState<PlantType | ''>(editTarget?.type || '');
  const [meaning, setMeaning] = useState(editTarget?.meaning || '');
  const [imagePreview, setImagePreview] = useState<string | undefined>(editTarget?.image);

  // 长期养护指南现在改为“可选生成/修改”，在卡片栏触发。
  // Wizard 只负责保留已有指南，不再自动生成/更新。
  const [careGuide] = useState(editTarget?.careGuide);
  const [careGuideSignature] = useState(editTarget?.careGuideSignature);
  
  const [light, setLight] = useState<LightLevel | null>(editTarget?.statusConfig.light || null);
  const [soil, setSoil] = useState<MoistureLevel | null>(editTarget?.statusConfig.soil || null);
  const [lastFertilized, setLastFertilized] = useState<string>(editTarget?.statusConfig.lastFertilized || '');
  
  // 交互状态
  const [hoveredBtn, setHoveredBtn] = useState<'light' | 'water' | 'fert' | null>(null);
  const [activePanel, setActivePanel] = useState<'light' | 'water' | 'fert' | null>(null);

  // 图片上传处理
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // 新增：移除已上传图片
  const handleRemoveImage = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // 防止触发 input 点击
    e.preventDefault();
    setImagePreview(undefined);
  };

  // 新增：删除植物卡片
  const handleDeletePlant = () => {
    if (editTarget && confirm(`Are you sure you want to remove "${editTarget.name}"?`)) {
        deletePlant(editTarget.id);
        onClose();
    }
  };

  // 完成创建/更新
  const handleFinish = () => {
    if (!type || !light || !soil || !lastFertilized) return;
    if (!name.trim() || !formalName.trim()) return;

    const nextCareGuideSignature =
      careGuideSignature ?? (careGuide ? makeGuideSignature({ formalName, type }) : undefined);
    
    const plantData: Plant = {
      id: editTarget?.id || crypto.randomUUID(),
      name,
      formalName: formalName.trim(),
      type: type as PlantType,
      meaning,
      image: imagePreview,
      statusConfig: { light, soil, lastFertilized },
      createdAt: editTarget?.createdAt || Date.now(),
      careGuide,
      careGuideSignature: nextCareGuideSignature,
    };

    if (editTarget) {
      updatePlant(editTarget.id, plantData);
    } else {
      addPlant(plantData);
    }
    onClose();
  };

  const handleNextStep = () => {
    if (!type) return;
    if (!name.trim() || !formalName.trim()) return;
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* 弹窗主体 */}
      <div className="relative w-full max-w-2xl bg-flora-bg rounded-4xl shadow-2xl overflow-hidden flex flex-col min-h-137.5 border border-white/50 transition-all">
        
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-6 right-6 z-20 p-2 rounded-full hover:bg-black/5 transition-colors">
          <X size={24} className="text-flora-dark" />
        </button>

        {/* --- Step 1: 基础档案 --- */}
        {step === 1 && (
          <div className="flex-1 p-10 flex flex-col animate-fade-in">
            <h2 className="font-serif text-3xl text-flora-primary mb-8">
              {editTarget ? 'Edit Profile' : 'New Seed Profile'}
            </h2>
            
            <div className="flex gap-8">
              {/* 图片上传/预览区 */}
              <div className="shrink-0 group relative w-32 h-32 rounded-3xl bg-white border-2 border-dashed border-flora-secondary/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-flora-primary transition-colors">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageUpload} accept="image/*" />
                
                {imagePreview ? (
                  <>
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    {/* 移除图片的遮罩层 */}
                    <div 
                        onClick={handleRemoveImage}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                        title="Remove Image"
                    >
                        <Trash2 className="text-white" size={20} />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-flora-secondary group-hover:text-flora-primary">
                    <Upload size={24} className="mx-auto mb-1" />
                    <span className="text-xs">Upload</span>
                  </div>
                )}
              </div>

              {/* 表单输入区 */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-flora-secondary tracking-widest">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border-b border-flora-secondary/30 py-2 font-serif text-xl text-flora-dark focus:outline-none focus:border-flora-primary" placeholder="e.g. Little Green" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-flora-secondary tracking-widest">Species</label>
                    <select 
                        value={type} 
                        onChange={e => setType(e.target.value as PlantType)} 
                        className={clsx(
                            "w-full bg-transparent border-b border-flora-secondary/30 py-2 focus:outline-none appearance-none cursor-pointer",
                            !type ? "text-flora-secondary/60" : "text-flora-dark"
                        )}
                    >
                        <option value="" disabled>Select Type...</option>
                        {Object.entries(SPECIES_DATA).map(([key, val]) => (
                            <option key={key} value={key} className="text-flora-dark">{val.label}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-flora-secondary tracking-widest">Formal Name</label>
                    <input value={formalName} onChange={e => setFormalName(e.target.value)} className="w-full bg-transparent border-b border-flora-secondary/30 py-2 text-flora-dark focus:outline-none" placeholder="e.g. 龟背竹 / 仙人掌" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-flora-secondary tracking-widest">Meaning</label>
                  <input value={meaning} onChange={e => setMeaning(e.target.value)} className="w-full bg-transparent border-b border-flora-secondary/30 py-2 text-flora-dark focus:outline-none" placeholder="e.g. Peace" />
                </div>
              </div>
            </div>

            {/* 底部按钮栏 */}
            <div className="mt-auto flex justify-between items-center pt-8">
              {/* 左侧：删除植物 (仅编辑时显示) */}
              {editTarget ? (
                  <button 
                    onClick={handleDeletePlant}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                     <Trash2 size={16} /> Delete Plant
                  </button>
              ) : (
                  <div /> // 占位保持 Flex 布局平衡
              )}

              {/* 右侧：下一步 */}
              <button 
                disabled={!name.trim() || !type || !formalName.trim()}
                onClick={handleNextStep}
                className="flex items-center gap-2 px-8 py-3 bg-flora-primary text-white rounded-full hover:bg-flora-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next Step <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* --- Step 2: 状态监控设置 --- */}
        {step === 2 && (
          <div className="flex-1 p-10 relative flex flex-col justify-center items-center">
            <h2 className="absolute top-10 left-10 font-serif text-2xl text-flora-primary/50">Status Monitor</h2>

            {/* 按钮群 (未选择子面板时显示) */}
            {!activePanel && (
              <div className="flex gap-12 group/container">
                <StatusButton 
                  icon={<Sun size={32} />} 
                  label="Light" 
                  isSet={!!light}
                  isHovered={hoveredBtn === 'light'}
                  isBlurred={hoveredBtn !== null && hoveredBtn !== 'light'}
                  onMouseEnter={() => setHoveredBtn('light')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setActivePanel('light')}
                />
                <StatusButton 
                  icon={<Droplets size={32} />} 
                  label="Water" 
                  isSet={!!soil}
                  isHovered={hoveredBtn === 'water'}
                  isBlurred={hoveredBtn !== null && hoveredBtn !== 'water'}
                  onMouseEnter={() => setHoveredBtn('water')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setActivePanel('water')}
                />
                <StatusButton 
                  icon={<Sprout size={32} />} 
                  label="Fertilizer" 
                  isSet={!!lastFertilized}
                  isHovered={hoveredBtn === 'fert'}
                  isBlurred={hoveredBtn !== null && hoveredBtn !== 'fert'}
                  onMouseEnter={() => setHoveredBtn('fert')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setActivePanel('fert')}
                />
              </div>
            )}

            {/* 子面板：光照 */}
            {activePanel === 'light' && (
              <SelectionPanel 
                question={`你的 ${name} 目前光照如何？`}
                options={[
                  { label: '充足 (直射)', value: 'full' },
                  { label: '柔和 (散射)', value: 'soft' },
                  { label: '阴暗 (无光)', value: 'shade' },
                ]}
                onSelect={(val) => { setLight(val as LightLevel); setActivePanel(null); }}
              />
            )}

            {/* 子面板：水分 */}
            {activePanel === 'water' && (
               <SelectionPanel 
               question={`摸摸 ${name} 的土壤感觉如何？`}
               options={[
                 { label: '潮湿 (粘手)', value: 'wet' },
                 { label: '微潮 (凉爽)', value: 'moist' },
                 { label: '干透 (沙化)', value: 'dry' },
               ]}
               onSelect={(val) => { setSoil(val as MoistureLevel); setActivePanel(null); }}
             />
            )}

            {/* 子面板：施肥日期 */}
            {activePanel === 'fert' && (
              <div className="animate-fade-in w-full max-w-md text-center">
                <h3 className="font-serif text-2xl text-flora-dark mb-6">上次给 {name} 施肥是哪一天？</h3>
                <div className="bg-white p-6 rounded-3xl shadow-sm inline-block">
                    <input 
                        type="date" 
                        value={lastFertilized}
                        onChange={(e) => setLastFertilized(e.target.value)}
                        className="font-serif text-2xl bg-transparent text-flora-primary border-b-2 border-flora-primary focus:outline-none text-center"
                    />
                </div>
                <div className="mt-8">
                    <button 
                        onClick={() => setActivePanel(null)} 
                        disabled={!lastFertilized} // 必须选日期
                        className="px-6 py-2 bg-flora-secondary/20 hover:bg-flora-secondary/40 rounded-full text-flora-dark font-medium transition-colors disabled:opacity-50"
                    >
                        Confirm Date
                    </button>
                </div>
              </div>
            )}

            {/* 完成按钮 (只有三项全齐才显示) */}
            {light && soil && lastFertilized && !activePanel && (
              <div className="absolute bottom-10 animate-fade-in">
                <button 
                  onClick={handleFinish}
                  className="px-12 py-3 bg-flora-primary text-white text-lg rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  Plant in Garden
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 子组件 (保持简洁) ---

interface StatusButtonProps {
  icon: ReactNode;
  label: string;
  isSet: boolean;
  isHovered: boolean;
  isBlurred: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function StatusButton({ icon, label, isSet, isHovered, isBlurred, onClick, onMouseEnter, onMouseLeave }: StatusButtonProps) {
  return (
      <div 
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={clsx(
              "flex flex-col items-center gap-3 cursor-pointer transition-all duration-500",
              isBlurred && "blur-sm opacity-50 scale-90",
              isHovered && "scale-110",
              !isBlurred && !isHovered && "opacity-80"
          )}
      >
          <div className={clsx(
              "w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-colors duration-300",
              isSet ? "bg-flora-primary text-white" : "bg-white text-flora-secondary",
              isHovered && !isSet && "bg-white text-flora-primary shadow-xl"
          )}>
              {icon}
          </div>
          <span className="font-serif font-medium text-flora-dark">{label}</span>
          {isSet && <Check size={16} className="text-flora-primary" />}
      </div>
  )
}

interface SelectionPanelOption {
  label: string;
  value: string;
}

interface SelectionPanelProps {
  question: string;
  options: SelectionPanelOption[];
  onSelect: (val: string) => void;
}

function SelectionPanel({ question, options, onSelect }: SelectionPanelProps) {
  return (
      <div className="animate-fade-in text-center w-full max-w-lg">
          <h3 className="font-serif text-2xl text-flora-dark mb-8">{question}</h3>
          <div className="grid grid-cols-3 gap-4">
              {options.map((opt) => (
                  <button 
                      key={opt.value}
                      onClick={() => onSelect(opt.value)}
                      className="py-4 px-2 rounded-2xl bg-white border border-flora-secondary/20 hover:border-flora-primary hover:bg-flora-primary/5 transition-all text-flora-dark font-medium"
                  >
                      {opt.label}
                  </button>
              ))}
          </div>
      </div>
  )
}