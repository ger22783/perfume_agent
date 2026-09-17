export type PumpSlot = {
  pump: 1 | 2 | 3 | 4 | 5;
  materialId: string;
  materialName: string;
};

export type HardwareProfile = {
  deviceId: string;
  name: string;
  pumps: PumpSlot[];
};

/**
 * MVP 固定装载方案。真实换瓶时只改这里，不改配方算法和串口代码。
 * 这五种原料覆盖前/中/后调以及 fresh/sweet/floral/woody/watery/warm 六个维度。
 */
export const activeHardwareProfile: HardwareProfile = {
  deviceId: 'aromacell-01',
  name: 'Aromacell 五泵演示机',
  pumps: [
    { pump: 1, materialId: 'japanese-citrus', materialName: '日系柑橘' },
    { pump: 2, materialId: 'sea-breeze-bell', materialName: '海上风铃' },
    { pump: 3, materialId: 'osmanthus-oolong', materialName: '桂花乌龙' },
    { pump: 4, materialId: 'desert-rose', materialName: '无人之境玫瑰' },
    { pump: 5, materialId: 'french-vanilla', materialName: '法国香草' }
  ]
};

export const activeMaterialIds = activeHardwareProfile.pumps.map((slot) => slot.materialId);

