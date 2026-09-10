/* 네이버에 붙여넣는 이미지는 표시 크기에 맞추고 PNG 원본은 서버에 남긴다. */
window.BlogImageEncoding = {
  async forClipboard(source) {
    const image = new Image();
    image.src = source;
    await image.decode();
    const ratio = Math.min(1, 800 / image.naturalWidth, 1200 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('브라우저에서 복사용 이미지를 준비하지 못했습니다.');
    function draw() {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    draw();
    let quality = 0.9;
    let result = canvas.toDataURL('image/jpeg', quality);
    while (result.length > 130000 && quality > 0.58) {
      quality -= 0.06;
      result = canvas.toDataURL('image/jpeg', quality);
    }
    while (result.length > 130000 && canvas.width > 400) {
      canvas.width = Math.round(canvas.width * 0.85);
      canvas.height = Math.round(canvas.height * 0.85);
      draw();
      result = canvas.toDataURL('image/jpeg', quality);
    }
    if (!result.startsWith('data:image/jpeg;base64,')) throw new Error('복사용 이미지 인코딩에 실패했습니다.');
    return result;
  }
};
