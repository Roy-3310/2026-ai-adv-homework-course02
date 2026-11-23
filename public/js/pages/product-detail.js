const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const productId = document.getElementById('app').dataset.productId;
    const product = ref(null);
    const related = ref([]);
    const loading = ref(true);
    const notFound = ref(false);
    const quantity = ref(1);
    const adding = ref(false);
    const activeView = ref(0);
    const openAcc = ref(0);
    const fallbackImage = 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800';

    // One product photo, three framings: full bouquet + two detail crops.
    const views = [
      { label: 'No.01 · 全貌', scale: 1, origin: '50% 50%' },
      { label: 'No.02 · 花材細節', scale: 1.7, origin: '35% 35%' },
      { label: 'No.03 · 包裝質感', scale: 1.9, origin: '65% 80%' }
    ];

    const perks = [
      { t: '市區當日配送', i: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>' },
      { t: '免費緞帶包裝', i: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>' },
      { t: '滿 NT$500 免運', i: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>' }
    ];

    const accordions = [
      { title: '購買須知', lines: ['花材依據季節供應，實際花束可能略有差異', '台北市區可享當日配送服務', '消費滿 NT$ 500 享免運優惠'] },
      { title: '鮮花照護', lines: ['收到後請斜剪花莖 1–2 公分並立即插入清水', '每 1–2 天換水一次，避開直射陽光與冷氣出風口', '摘除浸泡在水中的葉片，可延長花期'] },
      { title: '配送與退換', lines: ['付款完成後 24 小時內出貨，出貨後以 Email 通知', '鮮花屬易腐商品，如收到時有明顯損傷請於當日聯繫客服', '訂單資訊可於「我的訂單」隨時查詢'] }
    ];

    const imageUrl = computed(function () {
      return (product.value && product.value.image_url && product.value.image_url.replace(/w=\d+/, 'w=1200')) || fallbackImage;
    });

    const FAV_KEY = 'flower_favs';
    function readFavs() {
      try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
    }
    const fav = ref(readFavs().indexOf(productId) !== -1);
    function toggleFav() {
      fav.value = !fav.value;
      try {
        const set = readFavs().filter(function (id) { return id !== productId; });
        if (fav.value) set.push(productId);
        localStorage.setItem(FAV_KEY, JSON.stringify(set));
      } catch (e) { /* storage unavailable — keep in-memory state */ }
      Notification.show(fav.value ? '已加入收藏' : '已取消收藏', 'info');
    }

    function decrease() {
      if (quantity.value > 1) quantity.value--;
    }

    function increase() {
      if (product.value && quantity.value < product.value.stock) quantity.value++;
    }

    async function addToCart(evt) {
      if (!product.value || adding.value) return;
      adding.value = true;
      const origin = evt && evt.currentTarget;
      try {
        await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.value.id, quantity: quantity.value })
        });
        window.incrementCartBadge();
        Motion.flyToCart(origin);
        Notification.show('已加入購物車', 'success');
      } catch (e) {
        Notification.show('加入購物車失敗', 'error');
      } finally {
        adding.value = false;
      }
    }

    async function loadRelated() {
      try {
        const res = await apiFetch('/api/products?page=1&limit=12');
        related.value = res.data.products.filter(function (p) { return p.id !== productId; }).slice(0, 4);
      } catch (e) {
        related.value = [];
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/products/' + productId);
        product.value = res.data;
        document.title = res.data.name + ' — 花漾生活';
        document.body.classList.add('max-md:pb-[76px]');
        loadRelated();
      } catch (e) {
        notFound.value = true;
      } finally {
        loading.value = false;
      }
    });

    return {
      product, related, loading, notFound, quantity, adding, activeView, openAcc, views, perks, accordions,
      imageUrl, fallbackImage, fav, toggleFav, decrease, increase, addToCart
    };
  }
}).mount('#app');
