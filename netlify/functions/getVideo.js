const axios = require('axios');
const cheerio = require('cheerio');

// ‼️ HÃY DÁN API KEY CỦA BẠN VÀO ĐÂY
const API_KEY = '10fdd209c00734a4796eaa20f20b727'; // ⬅️ Thay thế bằng key của bạn

exports.handler = async (event, context) => {
  const videoUrl = event.queryStringParameters.url;
  if (!videoUrl) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Vui lòng cung cấp URL.' }) 
    };
  }

  // Tạo link API để "nhờ" ScraperAPI tải hộ
  const scrapeUrl = `http://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(videoUrl)}`;

  try {
    // 1. Dùng axios để gọi API cào web
    const response = await axios.get(scrapeUrl);
    
    // 2. Lấy HTML thô trả về
    const html = response.data;
    
    // 3. Dùng Cheerio để "đọc" HTML
    const $ = cheerio.load(html);

    // 4. Tự phân tích HTML để tìm thông tin
    // LƯU Ý: Đây là code để "bóc tách" HTML, nó có thể hỏng 
    // bất cứ lúc nào nếu Xvideos thay đổi giao diện.
    
    const title = $('h1.page-title').text().trim();
    
    let downloadLink = null;
    let duration = "Không rõ";
    let views = "Không rõ";

    // Tìm link tải và các thông tin khác trong thẻ script
    const scripts = $('script');
    const videoUrlRegex = /html5player\.setVideoUrlHigh\('(.*?)'\)/;
    const durationRegex = /html5player\.setVideoDuration\((\d+)\)/;
    const viewsRegex = /"views":(\d+),/;

    scripts.each((i, el) => {
        const scriptContent = $(el).html();
        if (scriptContent) {
            
            // Tìm link high
            if (!downloadLink) {
                const match = scriptContent.match(videoUrlRegex);
                if (match && match[1]) {
                    downloadLink = match[1];
                }
            }

            // Tìm thời lượng (tính bằng giây)
            if (duration === "Không rõ") {
                 const match = scriptContent.match(durationRegex);
                 if (match && match[1]) {
                     const seconds = parseInt(match[1], 10);
                     const min = Math.floor(seconds / 60);
                     const sec = seconds % 60;
                     duration = `${min} phút ${sec} giây`;
                 }
            }
            
            // Tìm lượt xem
             if (views === "Không rõ") {
                 const match = scriptContent.match(viewsRegex);
                 if (match && match[1]) {
                     views = parseInt(match[1], 10).toLocaleString('vi-VN');
                 }
            }
        }
    });

    if (!downloadLink) {
        throw new Error('Không thể phân tích link download. Cấu trúc trang đã thay đổi.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || "Không tìm thấy tiêu đề",
        downloadUrl: downloadLink,
        views: views,
        duration: duration
      }),
    };

  } catch (error) {
    console.error('Lỗi khi cào web:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Không thể lấy thông tin video.',
        details: error.message
      }),
    };
  }
};
