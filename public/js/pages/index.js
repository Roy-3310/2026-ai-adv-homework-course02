const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const products = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 9, totalPages: 0 });
    const loading = ref(true);
    const fallbackImage = 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600';

    const marqueeWords = ['Peony', 'Ranunculus', 'Lisianthus', 'Eucalyptus', 'Tulip', 'Sunflower', 'Dried Wreath', 'Lily'];

    const reviews = [
      { quote: '花束非常漂亮，包裝精緻，送給媽媽她超開心的！配送也很準時。', name: '小美', item: '粉色玫瑰花束' },
      { quote: '第二次購買了，品質一如既往的好。花材新鮮，整體搭配很有美感。', name: '阿明', item: '季節鮮花訂閱' },
      { quote: '女朋友收到花束超感動！會再回購的，推薦給大家！', name: '大衛', item: '經典紅玫瑰花束' }
    ];

    const services = [
      { title: '快速配送', desc: '台北市區當日配送', icon: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>' },
      { title: '精美包裝', desc: '每束花都經過精心包紮', icon: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>' },
      { title: '滿額免運', desc: '消費滿 NT$500 免運費', icon: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>' }
    ];

    function shortDesc(desc) {
      if (!desc) return '';
      return desc.split(/[，。]/)[0];
    }

    async function loadProducts(page) {
      page = page || 1;
      loading.value = true;
      try {
        const res = await apiFetch('/api/products?page=' + page + '&limit=9');
        products.value = res.data.products.map(function (p) {
          p._adding = false;
          return p;
        });
        pagination.value = res.data.pagination;
        if (page > 1) {
          const el = document.getElementById('products');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (e) {
        products.value = [];
      } finally {
        loading.value = false;
      }
    }

    function goToProduct(id) {
      window.location.href = '/products/' + id;
    }

    async function addToCart(product, evt) {
      if (product._adding) return;
      product._adding = true;
      const origin = evt && evt.currentTarget;
      try {
        await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: 1 })
        });
        window.incrementCartBadge();
        Motion.flyToCart(origin);
        Notification.show('已將「' + product.name + '」加入購物車', 'success');
      } catch (e) {
        Notification.show('加入購物車失敗', 'error');
      } finally {
        product._adding = false;
      }
    }

    onMounted(function () {
      loadProducts(1);
    });

    return {
      products, pagination, loading, fallbackImage, marqueeWords, reviews, services,
      loadProducts, goToProduct, addToCart, shortDesc
    };
  }
}).mount('#app');
