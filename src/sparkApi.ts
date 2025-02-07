import fetch from 'node-fetch';

export class SparkApi {
  private static readonly API_URL =
    'https://spark-api-open.xf-yun.com/v1/chat/completions';

  public static async generateName(
    text: string,
    apiPassword: string,
    prompt: string,
  ): Promise<string> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiPassword}`,
        },
        body: JSON.stringify({
          model: '4.0Ultra',
          messages: [
            {
              role: 'user',
              content: prompt.replace('${TEXT}', text),
            },
          ],
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || '请求失败');
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      }

      throw new Error('无法获取AI响应');
    } catch (error) {
      throw error;
    }
  }
}
