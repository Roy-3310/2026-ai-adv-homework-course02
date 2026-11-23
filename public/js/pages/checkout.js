const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const currentStep = 1;
    const loading = ref(true);
    const submitting = ref(false);
    const summaryOpen = ref(false);
    const cartItems = ref([]);
    const form = ref({ recipientName: '', recipientEmail: '', recipientAddress: '' });
    const errors = ref({});
    const fallbackImage = 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=200';

    // Prefill the email with the signed-in member's address
    const user = Auth.getUser();
    if (user && user.email) form.value.recipientEmail = user.email;
    if (user && user.name) form.value.recipientName = user.name;

    const cartTotal = computed(function () {
      return cartItems.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });
    const itemCount = computed(function () {
      return cartItems.value.reduce(function (sum, item) { return sum + item.quantity; }, 0);
    });
    const freeShipping = computed(function () { return cartTotal.value >= 500; });
    const grandTotal = computed(function () { return cartTotal.value + (freeShipping.value ? 0 : 150); });

    function validate() {
      errors.value = {};
      if (!form.value.recipientName.trim()) errors.value.recipientName = '請輸入收件人姓名';
      if (!form.value.recipientEmail.trim()) {
        errors.value.recipientEmail = '請輸入 Email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.recipientEmail)) {
        errors.value.recipientEmail = 'Email 格式不正確';
      }
      if (!form.value.recipientAddress.trim()) errors.value.recipientAddress = '請輸入收件地址';
      const ok = Object.keys(errors.value).length === 0;
      if (!ok) {
        const first = document.getElementById(Object.keys(errors.value)[0]);
        if (first) { first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
      return ok;
    }

    async function submitOrder() {
      if (!validate() || submitting.value) return;
      submitting.value = true;
      try {
        const res = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(form.value)
        });
        Notification.show('訂單已建立，正在前往付款…', 'success');
        window.location.href = '/ecpay/payment/' + res.data.id;
      } catch (err) {
        Notification.show(err?.data?.message || '訂單建立失敗', 'error');
        submitting.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/cart');
        cartItems.value = res.data.items;
        if (cartItems.value.length === 0) {
          window.location.href = '/cart';
          return;
        }
      } catch (e) {
        window.location.href = '/cart';
        return;
      }
      loading.value = false;
    });

    return {
      currentStep, loading, submitting, summaryOpen, cartItems, form, errors, fallbackImage,
      cartTotal, itemCount, freeShipping, grandTotal, submitOrder
    };
  }
}).mount('#app');
