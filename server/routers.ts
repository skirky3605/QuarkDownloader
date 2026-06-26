import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchAndParseVolunteerData, ExtractResult } from "./extract";
import { generateExcelFile, generateExcelFilename } from "./excel-generator";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  extract: router({
    fetchAndParse: publicProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        const result = await fetchAndParseVolunteerData(input.url);
        return result;
      }),

    generateExcel: publicProcedure
      .input(z.object({ data: z.any() }))
      .mutation(async ({ input }) => {
        const data = input.data as ExtractResult;
        const buffer = await generateExcelFile(data);
        const filename = generateExcelFilename(data);
        
        // 上传到 S3
        const { url } = await storagePut(`excel/${filename}`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return {
          url,
          filename,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
