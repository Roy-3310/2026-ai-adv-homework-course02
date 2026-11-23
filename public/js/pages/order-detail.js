const { createApp, ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const productImages = ref({});
    const petalCanvas = ref(null);
    let stopPetals = null;

    const statusMap = {
      pending: { label: '待付款', cls: 'pill-pending' },
      paid: { label: '已付款', cls: 'pill-paid' },
      failed: { label: '付款失敗', cls: 'pill-failed' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-mint text-moss' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-[#F3D9D4] text-clay' },
      cancel: { text: '付款已取消。', cls: 'bg-blush text-clay-dark' },
      pending: { text: '付款處理中，請點擊「查詢付款狀態」確認結果。', cls: 'bg-blush text-clay-dark' },
    };

    const isPaid = computed(function () { return !!order.value && order.value.status === 'paid'; });
    const currentStep = computed(function () { return isPaid.value ? 3 : 2; });

    // Wreath: 22 slots around the ring — every third is a berry, the rest alternate two leaf tones.
    const wreathLeaves = Array.from({ length: 22 }, function (_, i) {
      return {
        angle: (i * 360) / 22,
        berry: i % 3 === 0,
        color: i % 3 === 0 ? '#A8443A' : i % 2 ? '#3E4A33' : '#7C8B69',
        tilt: i % 2 ? 28 : -28
      };
    });

    const nextSteps = [
      { n: '01', title: '花藝師開始配置', desc: '今日依你選擇的花材修剪、醒花與包紮。', icon: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/>' },
      { n: '02', title: '24 小時內出貨', desc: '台北市區可享當日配送，出貨後以 Email 通知。', icon: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>' },
      { n: '03', title: '花束送達', desc: '收到後請斜剪花莖並盡快補水，延長花期。', icon: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>' }
    ];

    const recipientRows = computed(function () {
      if (!order.value) return [];
      return [
        { k: '收件人', v: order.value.recipient_name, icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>' },
        { k: 'Email', v: order.value.recipient_email, icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' },
        { k: '收件地址', v: order.value.recipient_address, icon: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>' }
      ];
    });

    function formatDate(s) {
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.getFullYear() + ' / ' + String(d.getMonth() + 1).padStart(2, '0') + ' / ' + String(d.getDate()).padStart(2, '0');
    }

    function itemImage(item) {
      return productImages.value[item.product_id] || null;
    }

    async function loadProductImages() {
      try {
        const res = await apiFetch('/api/products?page=1&limit=100');
        const map = {};
        res.data.products.forEach(function (p) { if (p.image_url) map[p.id] = p.image_url; });
        productImages.value = map;
      } catch (e) { /* receipt falls back to monogram tiles */ }
    }

    function celebrate() {
      nextTick(function () {
        if (stopPetals) stopPetals();
        stopPetals = Motion.petals(petalCanvas.value, { count: 110 });
      });
    }

    watch(isPaid, function (paid, was) {
      if (paid && !was) celebrate();
    });

    async function checkPayment() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/check-payment', {
          method: 'POST'
        });
        order.value = res.data;
        if (res.data.status === 'paid') {
          paymentResult.value = 'success';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          Notification.show(res.message || '尚未完成付款，請稍後再查詢', 'info');
        }
      } catch (e) {
        Notification.show(e?.data?.message || '查詢付款狀態失敗', 'error');
      } finally {
        paying.value = false;
      }
    }

    onMounted(async function () {
      loadProductImages();
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;

        if (paymentResult.value === 'pending' && order.value.status === 'pending') {
          await checkPayment();
        }
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    onBeforeUnmount(function () { if (stopPetals) stopPetals(); });

    return {
      order, loading, paying, paymentResult, statusMap, paymentMessages, isPaid, currentStep,
      wreathLeaves, nextSteps, recipientRows, petalCanvas, formatDate, itemImage, checkPayment
    };
  }
}).mount('#app');
