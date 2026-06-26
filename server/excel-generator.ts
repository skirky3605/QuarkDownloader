import ExcelJS from 'exceljs';
import { ExtractResult, VolunteerData } from './extract';

/**
 * 生成 Excel 文件
 */
export async function generateExcelFile(data: ExtractResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('志愿表');

  // 设置列宽
  worksheet.columns = [
    { header: '志愿序号', key: 'volunteerIndex', width: 12 },
    { header: '院校代码', key: 'schoolCode', width: 12 },
    { header: '院校名称', key: 'schoolName', width: 30 },
    { header: '专业代码', key: 'majorCode', width: 12 },
    { header: '专业名称', key: 'majorName', width: 25 },
    { header: '录取概率', key: 'probability', width: 12 },
    { header: '学制学费', key: 'studyPeriodAndFee', width: 18 },
    { header: '26年计划', key: 'planYear26', width: 12 },
    { header: '25年最低分', key: 'lowestScoreYear25', width: 14 },
    { header: '25年最低位次', key: 'lowestRankYear25', width: 14 },
    { header: '24年最低分', key: 'lowestScoreYear24', width: 14 },
    { header: '24年最低位次', key: 'lowestRankYear24', width: 14 },
    { header: '23年最低分', key: 'lowestScoreYear23', width: 14 },
    { header: '23年最低位次', key: 'lowestRankYear23', width: 14 },
  ];

  // 设置表头样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // 添加数据行
  data.volunteers.forEach((volunteer: VolunteerData) => {
    worksheet.addRow({
      volunteerIndex: volunteer.volunteerIndex,
      schoolCode: volunteer.schoolCode,
      schoolName: volunteer.schoolName,
      majorCode: volunteer.majorCode,
      majorName: volunteer.majorName,
      probability: volunteer.probability,
      studyPeriodAndFee: volunteer.studyPeriodAndFee,
      planYear26: volunteer.planYear26,
      lowestScoreYear25: volunteer.lowestScoreYear25,
      lowestRankYear25: volunteer.lowestRankYear25,
      lowestScoreYear24: volunteer.lowestScoreYear24 || '',
      lowestRankYear24: volunteer.lowestRankYear24 || '',
      lowestScoreYear23: volunteer.lowestScoreYear23 || '',
      lowestRankYear23: volunteer.lowestRankYear23 || '',
    });
  });

  // 设置数据行样式
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.font = { size: 10 };
      // 交替行背景色
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }
    }
  });

  // 冻结表头
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 1,
    },
  ];

  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as any;
}

/**
 * 将中文省份名称转换为拼音缩写
 */
function provinceToAbbr(province: string): string {
  const provinceMap: Record<string, string> = {
    '浙江': 'ZJ',
    '江苏': 'JS',
    '上海': 'SH',
    '北京': 'BJ',
    '天津': 'TJ',
    '重庆': 'CQ',
    '山东': 'SD',
    '江西': 'JX',
    '安徽': 'AH',
    '福建': 'FJ',
    '广东': 'GD',
    '广西': 'GX',
    '海南': 'HN',
    '四川': 'SC',
    '贵州': 'GZ',
    '云南': 'YN',
    '西藏': 'XZ',
    '陕西': 'SX',
    '甘肃': 'GS',
    '青海': 'QH',
    '宁夏': 'NX',
    '新疆': 'XJ',
    '河南': 'HA',
    '河北': 'HB',
    '山西': 'SX2',
    '内蒙古': 'NMG',
    '辽宁': 'LN',
    '吉林': 'JL',
    '黑龙江': 'HLJ',
    '湖南': 'HN2',
    '湖北': 'HUB',
  };
  return provinceMap[province] || 'UNKNOWN';
}

/**
 * 将批次名称转换为 ASCII 兼容格式
 */
function batchToAbbr(batch: string): string {
  const batchMap: Record<string, string> = {
    '本科一批': 'A',
    '本科二批': 'B',
    '本科提前批': 'EA',
    '高职高专': 'ZZ',
  };
  return batchMap[batch] || 'BATCH';
}

/**
 * 生成 Excel 文件名（ASCII 兼容）
 */
export function generateExcelFilename(data: ExtractResult): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const provinceAbbr = provinceToAbbr(data.province || '');
  const score = data.score?.replace(/\D/g, '') || '0';
  const batchAbbr = batchToAbbr(data.batch || '');

  return `volunteer_${provinceAbbr}_${score}_${batchAbbr}_${timestamp}.xlsx`;
}
