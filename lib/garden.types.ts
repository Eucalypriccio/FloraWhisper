// --- 1. 基础定义 ---

export type LightLevel = 'full' | 'soft' | 'shade'; // 用户选的：充足/柔和/阴暗
export type MoistureLevel = 'wet' | 'moist' | 'dry'; // 用户选的：潮湿/微潮/干透
export type PlantType = 'Succulent' | 'Fern' | 'Foliage' | 'Flowering'; // 植物种类

// 植物固有属性 (系统预设)
export interface PlantSpeciesProfile {
  label: string;
  prefLight: 'full' | 'soft' | 'shade'; // 喜好光照
  prefWater: 'wet' | 'moist' | 'dry';   // 喜好水分
  prefTemp: 'hot' | 'cold' | 'normal';  // 耐受温度
}

// 预设的植物种类数据字典
export const SPECIES_DATA: Record<PlantType, PlantSpeciesProfile> = {
  Succulent: { label: '多肉', prefLight: 'full', prefWater: 'dry', prefTemp: 'hot' }, // 喜光耐旱
  Fern:      { label: '蕨类植物', prefLight: 'shade', prefWater: 'wet', prefTemp: 'normal' }, // 喜阴喜湿
  Foliage:   { label: '观叶植物', prefLight: 'soft', prefWater: 'moist', prefTemp: 'normal' }, // 通用(如龟背竹)
  Flowering: { label: '开花植物', prefLight: 'full', prefWater: 'moist', prefTemp: 'normal' }, 
};

// --- 2. 核心数据接口 ---

export interface Plant {
  id: string;
  // 档案信息
  name: string;
  // 正式名称（例如：龟背竹、仙人掌）
  formalName?: string;
  type: PlantType;
  meaning: string;
  image?: string; // 图片 Blob URL
  
  // 用户设定的环境状态
  statusConfig: {
    light: LightLevel;
    soil: MoistureLevel;
    lastFertilized: string; // ISO Date String
  };
  
  createdAt: number;

  // 新增字段 (可选，因为旧数据可能没有)
  careGuide?: CareGuide;

  // 养护指南生成时的档案签名，用于判断是否需要“修改指南”
  // 规则：`${type}||${formalName.trim()}`
  careGuideSignature?: string;
}

// --- 3. 智能判断逻辑函数 ---

// A. 光照判断
export function getLightStatus(type: PlantType, current: LightLevel): 'Ideal' | 'Too Bright' | 'Too Dark' {
  const pref = SPECIES_DATA[type].prefLight;
  if (pref === current) return 'Ideal';
  
  // 简单逻辑：如果不匹配，判断是太亮还是太暗
  if (pref === 'full' && current !== 'full') return 'Too Dark';
  if (pref === 'shade' && current !== 'shade') return 'Too Bright';
  if (pref === 'soft') return current === 'full' ? 'Too Bright' : 'Too Dark';
  return 'Ideal';
}

// B. 水分判断
export function getWaterStatus(type: PlantType, current: MoistureLevel): 'Normal' | 'Thirsty' | 'Overwatered' {
  const pref = SPECIES_DATA[type].prefWater;
  
  // 逻辑映射
  if (current === 'moist') return 'Normal'; // 微潮通常都是安全的
  
  if (pref === 'dry') { // 喜旱植物
     if (current === 'wet') return 'Overwatered';
     return 'Normal';
  }
  if (pref === 'wet') { // 喜湿植物
     if (current === 'dry') return 'Thirsty';
     return 'Normal';
  }
  // 通用植物
  if (current === 'wet') return 'Overwatered';
  if (current === 'dry') return 'Thirsty';
  return 'Normal';
}

// C. 施肥判断 (季节性)
export function getFertilizerStatus(lastDateStr: string): 'Good' | 'Needed' {
  const today = new Date();
  const lastDate = new Date(lastDateStr);
  const month = today.getMonth() + 1; // 1-12
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 春秋 (3-5, 9-11): 生长期，15天
  const isGrowingSeason = (month >= 3 && month <= 5) || (month >= 9 && month <= 11);
  const threshold = isGrowingSeason ? 15 : 60; // 夏冬休眠期 60天

  return diffDays > threshold ? 'Needed' : 'Good';
}

// D. 温度判断 (Mock今日气温)
export function getTempStatus(type: PlantType, currentTemp: number): 'Comfortable' | 'High' | 'Low' {
  const pref = SPECIES_DATA[type].prefTemp;
  
  if (pref === 'hot') {
    if (currentTemp < 15) return 'Low';
    return 'Comfortable';
  }
  if (pref === 'cold') { // 耐寒
    if (currentTemp > 28) return 'High';
    return 'Comfortable';
  }
  // 通用
  if (currentTemp < 10) return 'Low';
  if (currentTemp > 30) return 'High';
  return 'Comfortable';
}

// --- 新增：养护指南接口 ---
export interface CareGuide {
  core: {
    light: string;
    water: string;
    soil: string;
    temp: string;
    fertilizer: string;
  };
  seasons: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
  };
}

// --- 新增：Mock 指南生成器 (模拟大模型) ---
export function generateMockCareGuide(type: PlantType, _name: string): CareGuide {
  // 这里暂时写死，未来替换为 LLM API 调用
  const displayName = _name?.trim() ? `「${_name.trim()}」` : '这株植物';
  const baseGuide = {
    Succulent: {
      soil: "疏松透气的颗粒土（颗粒占比70%以上），配合泥炭土。",
      fertilizer: "对肥料需求不高。生长季每月施一次低氮高磷钾的液肥。",
      seasons: {
        spring: "生长黄金期，可适当增加浇水频率，保持通风。",
        summer: "高温休眠，务必严格控水，遮阴防晒，避免黑腐。",
        autumn: "温差增大，是上色的好时机，恢复正常浇水。",
        winter: "低于5℃需移入室内，断水保暖。"
      }
    },
    Fern: {
      soil: "富含腐殖质、保水性好的微酸性土壤。",
      fertilizer: "喜肥，生长期每两周施一次稀薄的观叶植物液肥。",
      seasons: {
        spring: "保持盆土湿润，开始萌发新叶，注意防风。",
        summer: "早晚喷水增湿，避开正午强光，防止叶片焦枯。",
        autumn: "减少施肥，保持散射光照。",
        winter: "注意防寒保暖，减少浇水，保持空气湿度。"
      }
    },
    // 默认/其他
    General: {
      soil: "通用营养土，加入珍珠岩增加透气性。",
      fertilizer: "春秋生长季每月施用复合肥。",
      seasons: {
        spring: "换盆的好时机，修剪枯枝黄叶。",
        summer: "注意遮阴降温，增加通风。",
        autumn: "增加光照时间，为越冬储备养分。",
        winter: "控制浇水，停止施肥。"
      }
    }
  };

  const data = (type === 'Succulent' || type === 'Fern') ? baseGuide[type] : baseGuide.General;

  return {
    core: {
      light: type === 'Succulent' ? `${displayName}喜强光。建议放置在南向阳台，每天保持 4-6 小时直射光。` : `${displayName}喜半阴/散射光。避免强光直射，明亮的窗边最佳。`,
      water: type === 'Succulent' ? `${displayName}耐旱。干透浇透，宁干勿湿，避免积水。` : `${displayName}喜湿润。保持盆土微潮，空气干燥时需喷雾。`,
      soil: data.soil,
      temp: type === 'Succulent' ? "喜温差。适宜温度 15-28℃，不耐寒。" : "喜温暖。适宜温度 18-25℃，忌高温。",
      fertilizer: data.fertilizer,
    },
    seasons: data.seasons
  };
}