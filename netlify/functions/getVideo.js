const axios = require('axios');
const cheerio = require('cheerio');

// ‼️ API KEY CỦA BẠN (Đã hoạt động tốt)
const API_KEY = '10fdd209c00734a4796eaa20f20b727'; // Giữ nguyên key của bạn

exports.handler = async (event, context) => {
  const videoUrl = event.queryStringParameters.url;
  if (!videoUrl) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Vui lòng cung cấp URL.' }) 
    };
  }

  const scrapeUrl = `http://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(videoUrl)}`;

  try {
    const response = await axios.get(scrapeUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // === SỬA ĐỔI ĐỂ LẤY TIÊU ĐỀ ===
    // Thử lấy từ thẻ <title> của trang, cách này ổn định hơn
    let title = $('title').text().trim();
    if (title) {
        // Thường thẻ title sẽ có dạng "Tên Video - XVIDEOS.COM", ta loại bỏ phần đuôi
        title = title.replace(/ - XVIDEOS\.COM$/i, '').trim();
    }

    // Nếu thẻ <title> không có, thử lại cách cũ (biết đâu vẫn hoạt động)
    if (!title || title.length === 0) {
        title = $('h1.page-title').text().trim();
    }
    // ================================
    
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
            
            // Tìm link high (cái này đang hoạt động tốt)
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
        title: title || "Không tìm thấy tiêu đề", // Dùng title mới đã sửa
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
