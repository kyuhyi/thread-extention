document.addEventListener('DOMContentLoaded', async () => {
  await BlogImages.init();
  const stored = await BlogStore.get('blogWebtoonDraft');
  document.getElementById('blog-source').value = stored.blogWebtoonDraft?.text || '';
  document.querySelector('[data-target="blog"]').addEventListener('click', BlogImages.copyAll);
  document.getElementById('blog-source-apply').addEventListener('click', async () => {
    try { await BlogImages.setArticle(document.getElementById('blog-source').value, { auto: true }); }
    catch (error) { document.getElementById('blog-image-status').textContent = error.message; }
  });
});
