import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";

/**
 * 单元测试：验证 HTML 解析逻辑
 * 使用 fixture HTML 验证考生信息和志愿数据提取
 */

describe("HTML Parser Unit Tests", () => {
  // 模拟的 HTML 片段
  const mockHtml = `
    <div class="name-oSzck">张三</div>
    <div class="batch-content-1YlIc">本科一批</div>
    <div class="other-info-2Pnbh">
      <span>浙江</span>
      <span>物理</span>
      <span>650分</span>
      <span>1234位</span>
    </div>
    
    <div class="school-item-WNsqb">
      <div class="school-index-1aC55">1</div>
      <p class="school-name-code-2oo9Q">[10001] 浙江大学</p>
      
      <div class="marjor-item-3NPQK">
        <div class="marjor-name-10dDA">[001] 计算机科学与技术</div>
        <div class="percentage-2VbVf">95%</div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">学制学费</span>
          <span class="value-2qrk8">4年/6000元</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">26年计划</span>
          <span class="value-2qrk8">50</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">25年最低分</span>
          <span class="value-2qrk8">640</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">最低位次</span>
          <span class="value-2qrk8">2000</span>
        </div>
      </div>
      
      <div class="marjor-item-3NPQK">
        <div class="marjor-name-10dDA">[002] 软件工程</div>
        <div class="percentage-2VbVf">92%</div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">学制学费</span>
          <span class="value-2qrk8">4年/8000元</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">26年计划</span>
          <span class="value-2qrk8">30</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">25年最低分</span>
          <span class="value-2qrk8">635</span>
        </div>
        <div class="col-3Va3W">
          <span class="label-1tqZC">最低位次</span>
          <span class="value-2qrk8">2500</span>
        </div>
      </div>
    </div>
  `;

  it("should extract student info correctly", () => {
    const $ = cheerio.load(mockHtml);
    
    const name = $("span.name-oSzck").text().trim();
    const batch = $("div.batch-content-1YlIc").text().trim();
    const spans = $("div.other-info-2Pnbh span");
    
    expect(batch).toBe("本科一批");
    expect(spans.length).toBe(4);
  });

  it("should extract school info correctly", () => {
    const $ = cheerio.load(mockHtml);
    
    const schoolItem = $("div.school-item-WNsqb").first();
    const volunteerIndex = schoolItem.find("div.school-index-1aC55").text().trim();
    const schoolNameCodeText = schoolItem.find("p.school-name-code-2oo9Q").text().trim();
    
    expect(volunteerIndex).toBe("1");
    expect(schoolNameCodeText).toContain("浙江大学");
    expect(schoolNameCodeText).toContain("[10001]");
  });

  it("should extract all majors from a school", () => {
    const $ = cheerio.load(mockHtml);
    
    const schoolItem = $("div.school-item-WNsqb").first();
    const majorItems = schoolItem.find("div.marjor-item-3NPQK");
    
    expect(majorItems.length).toBe(2);
    
    // 验证第一个专业
    const firstMajor = majorItems.eq(0);
    expect(firstMajor.find("div.marjor-name-10dDA").text()).toContain("计算机科学与技术");
    expect(firstMajor.find("div.percentage-2VbVf").text()).toBe("95%");
    
    // 验证第二个专业
    const secondMajor = majorItems.eq(1);
    expect(secondMajor.find("div.marjor-name-10dDA").text()).toContain("软件工程");
    expect(secondMajor.find("div.percentage-2VbVf").text()).toBe("92%");
  });

  it("should extract major details correctly", () => {
    const $ = cheerio.load(mockHtml);
    
    const majorItem = $("div.marjor-item-3NPQK").first();
    const cols = majorItem.find("div.col-3Va3W");
    const infoMap: Record<string, string> = {};
    
    cols.each((i, elem) => {
      const label = $(elem).find("span.label-1tqZC").text().trim();
      const value = $(elem).find("span.value-2qrk8").text().trim();
      if (label && value) {
        infoMap[label] = value;
      }
    });
    
    expect(infoMap["学制学费"]).toBe("4年/6000元");
    expect(infoMap["26年计划"]).toBe("50");
    expect(infoMap["25年最低分"]).toBe("640");
    expect(infoMap["最低位次"]).toBe("2000");
  });

  it("should extract major code from name", () => {
    const majorNameCodeText = "[001] 计算机科学与技术";
    const codeMatch = majorNameCodeText.match(/\[(\d+)\]/);
    const majorCode = codeMatch ? codeMatch[1] : "";
    const majorName = majorNameCodeText.replace(/\[\d+\]\s*/, "").trim();
    
    expect(majorCode).toBe("001");
    expect(majorName).toBe("计算机科学与技术");
  });

  it("should handle missing optional fields", () => {
    const minimalHtml = `
      <div class="marjor-item-3NPQK">
        <div class="marjor-name-10dDA">[001] 专业名称</div>
        <div class="percentage-2VbVf">85%</div>
      </div>
    `;
    
    const $ = cheerio.load(minimalHtml);
    const majorItem = $("div.marjor-item-3NPQK");
    const cols = majorItem.find("div.col-3Va3W");
    
    // 当没有详细信息时，应该返回空字符串
    expect(cols.length).toBe(0);
  });
});
