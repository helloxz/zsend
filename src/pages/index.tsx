// Wrangler 的 rules 配置会将 .html 文件作为 Text 导入，这里直接获取文件内容
// @ts-ignore - .html 文件通过 wrangler rules 以 Text 形式导入
import indexHtml from "../../public/index.html";

// 返回前端 SPA 页面
export const indexPage = (): string => {
    return indexHtml;
};
