import axios from 'axios';
import * as cheerio from 'cheerio';
import { TRPCError } from '@trpc/server';

/**
 * 志愿表数据接口
 */
export interface VolunteerData {
  volunteerIndex: string;
  schoolCode: string;
  schoolName: string;
  majorCode: string;
  majorName: string;
  probability: string;
  studyPeriodAndFee: string;
  planYear26: string;
  lowestScoreYear25: string;
  lowestRankYear25: string;
  lowestScoreYear24?: string;
  lowestRankYear24?: string;
  lowestScoreYear23?: string;
  lowestRankYear23?: string;
}

/**
 * 考生信息接口
 */
export interface StudentInfo {
  province: string;
  subjects: string;
  score: string;
  rank: string;
  batch: string;
  volunteerName: string;
}

/**
 * 完整提取结果
 */
export interface ExtractResult {
  studentInfo: StudentInfo;
  volunteers: VolunteerData[];
  province: string;
  score: string;
  rank: string;
  batch: string;
}

/**
 * 从 URL 获取 HTML 内容
 */
async function fetchHtml(url: string): Promise<string> {
  try {
    // 验证 URL 是否为夸克高考志愿表
    if (!url.includes('vt.quark.cn') || !url.includes('volunteer-detail-outside')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '请输入有效的夸克高考志愿表分享链接',
      });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new TRPCError({
        code: 'TIMEOUT',
        message: '网页加载超时，请检查网络连接',
      });
    }
    if (error.response?.status === 404) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '链接已失效或页面不存在',
      });
    }
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '无法访问该链接，请检查网络连接和链接是否正确',
    });
  }
}

/**
 * 提取考生基本信息
 */
function extractStudentInfo($: cheerio.CheerioAPI): StudentInfo {
  const volunteerName = $('span.name-oSzck').text().trim();
  const batch = $('div.batch-content-1YlIc').text().trim();
  
  const otherInfoSpans = $('div.other-info-2Pnbh span');
  let province = '';
  let subjects = '';
  let score = '';
  let rank = '';

  otherInfoSpans.each((i, elem) => {
    const text = $(elem).text().trim();
    if (i === 0) province = text;
    else if (i === 1) subjects = text;
    else if (i === 2) score = text;
    else if (i === 3) rank = text;
  });

  return {
    province,
    subjects,
    score,
    rank,
    batch,
    volunteerName,
  };
}

/**
 * 提取单个学校的所有专业数据
 */
function extractVolunteerDataFromSchool($: cheerio.CheerioAPI, schoolItem: any, volunteerIndex: string): VolunteerData[] {
  try {
    const $item = $(schoolItem);

    // 院校代码和名称
    const schoolNameCodeText = $item.find('p.school-name-code-2oo9Q').text().trim();
    const codeMatch = schoolNameCodeText.match(/\[(\d+)\]/);
    const schoolCode = codeMatch ? codeMatch[1] : '';
    const schoolName = schoolNameCodeText.replace(/\[\d+\]\s*/, '').trim();

    // 提取每个专业
    const majorItems = $item.find('div.marjor-item-3NPQK');
    const results: VolunteerData[] = [];

    majorItems.each((i, majorElem) => {
      try {
        const $majorItem = $(majorElem);
        
        const majorNameCodeText = $majorItem.find('div.marjor-name-10dDA').text().trim();
        const majorCodeMatch = majorNameCodeText.match(/\[(\d+)\]/);
        const majorCode = majorCodeMatch ? majorCodeMatch[1] : '';
        const majorName = majorNameCodeText.replace(/\[\d+\]\s*/, '').trim();

        // 录取概率
        const probability = $majorItem.find('div.percentage-2VbVf').text().trim();

        // 其他信息
        const cols = $majorItem.find('div.col-3Va3W');
        const infoMap: Record<string, string> = {};

        cols.each((j, elem) => {
          const label = $(elem).find('span.label-1tqZC').text().trim();
          const value = $(elem).find('span.value-2qrk8').text().trim();
          if (label && value) {
            infoMap[label] = value;
          }
        });

        results.push({
          volunteerIndex,
          schoolCode,
          schoolName,
          majorCode,
          majorName,
          probability,
          studyPeriodAndFee: infoMap['学制学费'] || '',
          planYear26: infoMap['26年计划'] || '',
          lowestScoreYear25: infoMap['25年最低分'] || '',
          lowestRankYear25: infoMap['最低位次'] || '',
          lowestScoreYear24: infoMap['24年最低分'] || '',
          lowestRankYear24: infoMap['24年最低位次'] || '',
          lowestScoreYear23: infoMap['23年最低分'] || '',
          lowestRankYear23: infoMap['23年最低位次'] || '',
        });
      } catch (error) {
        console.error('Error extracting major data:', error);
      }
    });

    return results;
  } catch (error) {
    console.error('Error extracting school data:', error);
    return [];
  }
}

/**
 * 解析 HTML 并提取所有数据
 */
function parseHtml(html: string): ExtractResult {
  const $ = cheerio.load(html);

  // 提取考生信息
  const studentInfo = extractStudentInfo($);

  // 提取所有志愿数据
  const volunteers: VolunteerData[] = [];
  const schoolItems = $('div.school-item-WNsqb');

  schoolItems.each((i, elem) => {
    const volunteerIndex = $(elem).find('div.school-index-1aC55').text().trim();
    const schoolVolunteers = extractVolunteerDataFromSchool($, elem, volunteerIndex);
    volunteers.push(...schoolVolunteers);
  });

  if (volunteers.length === 0) {
    throw new TRPCError({
      code: 'PARSE_ERROR',
      message: '无法解析志愿表数据，请确保链接正确',
    });
  }

  return {
    studentInfo,
    volunteers,
    province: studentInfo.province,
    score: studentInfo.score,
    rank: studentInfo.rank,
    batch: studentInfo.batch,
  };
}

/**
 * 主函数：从 URL 获取并解析数据
 */
export async function fetchAndParseVolunteerData(url: string): Promise<ExtractResult> {
  const html = await fetchHtml(url);
  const result = parseHtml(html);
  return result;
}
