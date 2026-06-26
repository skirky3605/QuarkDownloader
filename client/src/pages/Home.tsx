import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const [url, setUrl] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const extractMutation = trpc.extract.fetchAndParse.useMutation({
    onSuccess: (result) => {
      setPreviewData(result);
      toast.success("数据提取成功！");
    },
    onError: (err: any) => {
      const errorMsg = err?.message || "数据提取失败，请检查链接是否正确";
      setError(errorMsg);
      toast.error(errorMsg);
    },
  });

  const excelMutation = trpc.extract.generateExcel.useMutation({
    onSuccess: (response) => {
      // 创建下载链接
      const link = document.createElement("a");
      link.href = response.url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Excel 文件已下载");
    },
    onError: () => {
      toast.error("Excel 生成失败");
    },
  });

  const handleExtract = () => {
    if (!url.trim()) {
      setError("请输入有效的夸克高考志愿表链接");
      return;
    }

    setError(null);
    setPreviewData(null);
    extractMutation.mutate({ url });
  };

  const handleDownload = () => {
    if (!previewData) return;
    excelMutation.mutate({ data: previewData });
  };

  const isLoading = extractMutation.isPending || excelMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* 工业风格背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gray-800 opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-700 opacity-20 transform translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gray-700 opacity-10 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* 主容器 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* 标题区域 */}
        <div className="mb-16 text-center">
          <h1 className="text-7xl md:text-8xl font-black text-white mb-4 tracking-tighter">
            QUARK
          </h1>
          <h2 className="text-xl md:text-2xl font-light tracking-widest text-gray-400 uppercase">
            TABLE TO EXCEL
          </h2>
          <div className="w-24 h-1 bg-gray-600 mx-auto mt-8"></div>
        </div>

        {/* 主卡片 */}
        <div className="w-full max-w-2xl">
          <div className="bg-gray-800 border-2 border-gray-700 p-12 mb-8">
            <p className="text-gray-300 text-center mb-8 text-lg font-light tracking-wide">
              粘贴夸克高考志愿表分享链接，一键提取并导出为 Excel
            </p>

            {/* URL 输入框 */}
            <div className="mb-8">
              <label className="block text-gray-400 text-sm font-light tracking-widest uppercase mb-4">
                志愿表链接
              </label>
              <Input
                type="text"
                placeholder="https://vt.quark.cn/blm/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleExtract()}
                className="w-full bg-gray-900 border-gray-600 text-white placeholder-gray-500 h-12 text-base"
                disabled={isLoading}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900 bg-opacity-30 border border-red-700 p-4 mb-8">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* 提取按钮 */}
            <Button
              onClick={handleExtract}
              disabled={isLoading || !url.trim()}
              className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white font-semibold tracking-wider uppercase text-base border-2 border-gray-600 hover:border-gray-500 disabled:opacity-50"
            >
              {extractMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "提取数据"
              )}
            </Button>
          </div>

          {/* 数据预览区域 */}
          {previewData && (
            <div className="bg-gray-800 border-2 border-gray-700 p-8">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold tracking-wider uppercase">数据预览</h3>
              </div>

              {/* 考生信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-gray-700">
                <div>
                  <p className="text-gray-400 text-xs font-light tracking-widest uppercase mb-2">省份</p>
                  <p className="text-white text-lg font-semibold">{previewData.province}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-light tracking-widest uppercase mb-2">分数</p>
                  <p className="text-white text-lg font-semibold">{previewData.score}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-light tracking-widest uppercase mb-2">排名</p>
                  <p className="text-white text-lg font-semibold">{previewData.rank}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-light tracking-widest uppercase mb-2">批次</p>
                  <p className="text-white text-lg font-semibold">{previewData.batch}</p>
                </div>
              </div>

              {/* 志愿数量 */}
              <p className="text-gray-300 mb-6 text-base">
                共提取 <span className="font-bold text-white text-lg">{previewData.volunteers.length}</span> 个志愿
              </p>

              {/* 预览表格 */}
              <div className="overflow-x-auto mb-8 max-h-96">
                <table className="w-full text-xs text-gray-300">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="border-b-2 border-gray-600">
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">序号</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">院校代码</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">院校名称</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">专业代码</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">专业名称</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">概率</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">25年最低分</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-200 whitespace-nowrap">25位次</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.volunteers.map((vol: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-30">
                        <td className="py-2 px-2 whitespace-nowrap">{vol.volunteerIndex}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{vol.schoolCode}</td>
                        <td className="py-2 px-2 truncate max-w-xs">{vol.schoolName}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{vol.majorCode}</td>
                        <td className="py-2 px-2 truncate max-w-xs">{vol.majorName}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{vol.probability}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{vol.lowestScoreYear25}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{vol.lowestRankYear25}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-300 mb-6 text-sm">
                共显示 <span className="font-bold text-white">{previewData.volunteers.length}</span> 条记录
              </p>

              {/* 下载按钮 */}
              <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="w-full h-12 bg-green-700 hover:bg-green-600 text-white font-semibold tracking-wider uppercase text-base border-2 border-green-600 hover:border-green-500 disabled:opacity-50"
              >
                {excelMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "下载 Excel"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* 底部说明 */}
        <div className="mt-16 text-center text-gray-500 text-xs font-light tracking-widest uppercase">
          <p>支持夸克高考志愿表分享链接 | 数据安全 | 实时处理</p>
        </div>
      </div>
    </div>
  );
}
