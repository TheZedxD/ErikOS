export function wireTaskbarButtons(){
  window.addEventListener('window-focused', e => {
    const id = e.detail.id;
    document.querySelectorAll('#taskbar-windows .task-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.win === id);
    });
  });
  window.addEventListener('window-blurred', e => {
    const id = e.detail.id;
    const btn = document.querySelector(`#taskbar-windows .task-btn[data-win="${id}"]`);
    btn?.classList.remove('active');
  });
}
