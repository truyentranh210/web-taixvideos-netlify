const xvideos = require('xvideosx');

exports.handler = async (event, context) => {
  // Lấy URL video từ query string (ví dụ: .../api/getVideo?url=http://...)
  const videoUrl = event.queryStringParameters.url;

  if (!videoUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Vui lòng cung cấp URL.' }),
    };
  }

  try {
    // Cố gắng lấy thông tin video
    // Đây là nơi 99% sẽ thất bại do bị Netlify chặn
    const video = await xvideos.details(videoUrl);

    // Lấy link tải (chất lượng cao nhất nếu có)
    const downloadLink = video.streams.high || video.streams.low || null;
    
    if (!downloadLink) {
         throw new Error('Không tìm thấy link download.');
    }

    // Trả về thông tin cho frontend
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: video.title,
        views: video.views,
        tags: video.tags,
        duration: video.duration,
        downloadUrl: downloadLink,
      }),
    };

  } catch (error) {
    // Trả về lỗi nếu bị chặn hoặc không tìm thấy
    console.error('Lỗi khi lấy video:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Không thể lấy thông tin video. Server có thể đã bị chặn.',
        details: error.message
      }),
    };
  }
};
