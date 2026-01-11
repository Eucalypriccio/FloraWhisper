import {
  getFertilizerStatus,
  getLightStatus,
  getTempStatus,
  getWaterStatus,
  type Plant,
} from '@/lib/garden.types';

export type GardenWeatherSnapshot = {
  temp: number;
  humidity: number;
  condition?: string;
  loading: boolean;
  error: string | null;
};

export function buildGardenWarnings(plants: Plant[], weather: GardenWeatherSnapshot) {
  const plantWarnings: string[] = [];
  const envWarnings: string[] = [];

  const pushUnique = (list: string[], text: string) => {
    if (!text) return;
    if (!list.includes(text)) list.push(text);
  };

  // 1. 遍历植物检查状态
  plants.forEach((plant) => {
    const plantLabel = `「${plant.name}」`;

    // 水分
    const wStatus = getWaterStatus(plant.type, plant.statusConfig.soil);
    if (wStatus === 'Thirsty') {
      pushUnique(
        plantWarnings,
        `${plantLabel}土壤偏干。建议立刻补水：浇透至盆底出水，并倒掉托盘积水。`
      );
      pushUnique(plantWarnings, `若${plantLabel}为蕨类或喜湿植物，建议同时喷雾增湿或放加湿托盘。`);
    }
    if (wStatus === 'Overwatered') {
      pushUnique(
        plantWarnings,
        `${plantLabel}土壤过湿。建议暂停浇水三到七天，加强通风；必要时松土或更换更透气基质。`
      );
      if (plant.type === 'Succulent') {
        pushUnique(
          plantWarnings,
          `${plantLabel}为多肉，过湿易黑腐。建议检查根系是否软烂，必要时修根并换颗粒土。`
        );
      }
    }

    // 施肥
    const fStatus = getFertilizerStatus(plant.statusConfig.lastFertilized);
    if (fStatus === 'Needed') {
      pushUnique(plantWarnings, `${plantLabel}距离上次施肥较久。建议薄肥勤施：先浇水后施肥，避免烧根。`);
    }

    // 光照
    const lStatus = getLightStatus(plant.type, plant.statusConfig.light);
    if (lStatus === 'Too Dark') {
      pushUnique(plantWarnings, `${plantLabel}光照不足。建议移到更明亮的散射光处；开花植物可能会减少开花。`);
    }
    if (lStatus === 'Too Bright') {
      pushUnique(
        plantWarnings,
        `${plantLabel}光照偏强。建议避开正午直射，移到散射光处或加一层纱帘，防止叶片灼伤。`
      );
    }

    // 温度（基于实时天气）
    if (!weather.loading && !weather.error) {
      const tStatus = getTempStatus(plant.type, weather.temp);
      if (tStatus === 'High') {
        pushUnique(plantWarnings, `${plantLabel}可能偏热。建议遮阴降温、加强通风，避免正午浇水和闷热。`);
      }
      if (tStatus === 'Low') {
        pushUnique(plantWarnings, `${plantLabel}可能偏冷。建议移到室内，减少浇水并远离冷风直吹。`);
      }
    }
  });

  // 2. 环境建议 (基于实时天气)
  if (!weather.loading && !weather.error) {
    const temp = weather.temp;
    const humidity = weather.humidity;
    const condition = (weather.condition || '').toLowerCase();

    // 温度
    if (temp >= 32) {
      pushUnique(envWarnings, `气温偏高。建议中午遮阴、加强通风；浇水尽量在清晨或傍晚进行。`);
    } else if (temp <= 5) {
      pushUnique(envWarnings, `气温偏低。建议把不耐寒植物移入室内，减少浇水并避免冻伤。`);
    } else if (temp <= 10) {
      pushUnique(envWarnings, `气温偏凉。建议控水、减少施肥，避免植物们夜间受寒。`);
    }

    // 湿度
    if (humidity <= 35) {
      pushUnique(envWarnings, `空气偏干。建议加湿、喷雾、水托盘增湿，尤其是蕨类与观叶植物。`);
    } else if (humidity >= 80) {
      pushUnique(envWarnings, `空气湿度偏高。建议加强通风、减少叶面长时间积水，防止霉菌与病斑。`);
    }

    // 天气状况
    if (condition.includes('rain')) {
      pushUnique(envWarnings, `当前有降雨。室外植物注意避免积水；已偏湿的盆土先暂停浇水。`);
    }
    if (condition.includes('thunder')) {
      pushUnique(envWarnings, `可能有雷暴天气。建议把易倒伏盆栽收回室内，避免强风损伤。`);
    }
    if (condition.includes('fog')) {
      pushUnique(envWarnings, `当前较潮湿。建议增加通风与光照，留意叶片是否出现霉斑或白粉。`);
    }
    if (condition.includes('snow')) {
      pushUnique(envWarnings, `当前可能有降雪。建议避免叶片结冰，优先保温防寒。`);
    }
  }

  const hasPlants = plants.length > 0;
  const isAllGood = hasPlants && plantWarnings.length === 0 && envWarnings.length === 0;

  return {
    plantWarnings,
    envWarnings,
    hasPlants,
    isAllGood,
  };
}
