/* ФЛЁР — интерактив лендинга.
   Без библиотек: меню, липкая шапка, появление блоков, маска телефона,
   выбор свободного времени и заявка в Telegram. */

(function () {
  "use strict";

  /* ------------------------------------------------ липкая шапка + меню */

  var header = document.getElementById("header");
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }

  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove("is-open");
    header.classList.remove("is-open");
    burger.classList.remove("is-active");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      header.classList.toggle("is-open", open);
      burger.classList.toggle("is-active", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeMenu();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------- появление блоков */

  var revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealItems.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = (index % 3) * 70 + "ms";
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* ------------------------------------------------------ форма записи */

  var form = document.getElementById("booking-form");
  var status = document.getElementById("form-status");
  var phoneInput = document.getElementById("phone");
  var dateInput = document.getElementById("date");
  var timeInput = document.getElementById("time");
  var slotsWrap = document.getElementById("slots");

  var TELEGRAM = "fler_beauty";
  var SLOT_TIMES = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];

  var defaultHint = "Нажимая кнопку, вы соглашаетесь на обработку персональных данных.";

  function setStatus(text, type) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove("is-error", "is-success");
    if (type) status.classList.add(type);
  }

  /* Маска: +7 (999) 123-45-67 */
  function formatPhone(value) {
    var digits = value.replace(/\D/g, "");

    if (digits[0] === "8") digits = "7" + digits.slice(1);
    if (digits[0] !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);

    var rest = digits.slice(1);
    var out = "+7";

    if (rest.length) out += " (" + rest.slice(0, 3);
    if (rest.length >= 3) out += ")";
    if (rest.length > 3) out += " " + rest.slice(3, 6);
    if (rest.length > 6) out += "-" + rest.slice(6, 8);
    if (rest.length > 8) out += "-" + rest.slice(8, 10);

    return out;
  }

  if (phoneInput) {
    phoneInput.addEventListener("focus", function () {
      if (!phoneInput.value) phoneInput.value = "+7 (";
    });

    phoneInput.addEventListener("input", function () {
      phoneInput.value = formatPhone(phoneInput.value);
    });

    phoneInput.addEventListener("blur", function () {
      if (phoneInput.value.replace(/\D/g, "").length <= 1) phoneInput.value = "";
    });
  }

  /* Даты: сегодня и 60 дней вперёд */
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function iso(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function minutesOf(value) {
    var parts = value.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  var today = new Date();
  var tomorrow = new Date(today.getTime() + 86400000);

  if (dateInput) {
    dateInput.min = iso(today);
    dateInput.max = iso(new Date(today.getTime() + 60 * 86400000));
    /* По умолчанию открываем завтра: к вечеру у сегодняшнего дня
       почти не остаётся свободных окон. */
    dateInput.value = iso(tomorrow);
  }

  /* Стабильный «занятый» набор для каждой даты: демо-расписание,
     которое не дёргается при каждом клике. */
  function hashString(value) {
    var hash = 0;
    for (var i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function renderSlots(dateValue) {
    if (!slotsWrap) return;

    slotsWrap.innerHTML = "";
    if (timeInput) timeInput.value = "";

    if (!dateValue) {
      var empty = document.createElement("span");
      empty.className = "slots__hint";
      empty.textContent = "Сначала выберите дату";
      slotsWrap.appendChild(empty);
      return;
    }

    var seed = hashString(dateValue);
    var schedule = SLOT_TIMES.map(function (time, index) {
      return { time: time, busy: (seed + index * 13) % 5 === 0 };
    });

    /* Не больше трёх занятых окон — иначе день выглядит закрытым. */
    var busyCount = schedule.filter(function (slot) {
      return slot.busy;
    }).length;

    for (var i = 0; i < schedule.length && busyCount > 3; i++) {
      if (schedule[i].busy) {
        schedule[i].busy = false;
        busyCount--;
      }
    }

    var isToday = dateValue === iso(new Date());
    var nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    var hasFree = false;

    schedule.forEach(function (slot) {
      var past = isToday && minutesOf(slot.time) < nowMinutes + 60;
      var disabled = slot.busy || past;
      var button = document.createElement("button");

      button.type = "button";
      button.className = "slot";
      button.textContent = slot.time;
      button.setAttribute("aria-pressed", "false");

      if (disabled) {
        button.disabled = true;
        button.title = slot.busy ? "Это время занято" : "Время уже прошло";
      } else {
        hasFree = true;
        button.addEventListener("click", function () {
          selectSlot(button, slot.time);
        });
      }

      slotsWrap.appendChild(button);
    });

    if (!hasFree) {
      var hint = document.createElement("span");
      hint.className = "slots__hint";
      hint.textContent = "На этот день свободных окон нет — выберите другую дату.";
      slotsWrap.appendChild(hint);
    }
  }

  function selectSlot(button, time) {
    var all = slotsWrap.querySelectorAll(".slot");

    all.forEach(function (item) {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");

    if (timeInput) timeInput.value = time;
    setStatus(defaultHint, null);
  }

  if (dateInput) {
    dateInput.addEventListener("change", function () {
      renderSlots(dateInput.value);
    });
  }

  renderSlots(dateInput ? dateInput.value : "");

  function formatDate(value) {
    if (!value) return "";
    var parts = value.split("-");
    if (parts.length !== 3) return value;
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var service = form.elements.service.value;
      var master = form.elements.master.value;
      var date = form.elements.date.value;
      var time = form.elements.time.value;
      var digits = phone.replace(/\D/g, "");

      if (name.length < 2) {
        setStatus("Напишите имя — хотя бы две буквы.", "is-error");
        form.elements.name.focus();
        return;
      }

      if (digits.length !== 11) {
        setStatus("Проверьте телефон: нужно 11 цифр.", "is-error");
        form.elements.phone.focus();
        return;
      }

      if (!service) {
        setStatus("Выберите услугу из списка.", "is-error");
        form.elements.service.focus();
        return;
      }

      if (!date) {
        setStatus("Укажите дату визита.", "is-error");
        form.elements.date.focus();
        return;
      }

      if (!time) {
        setStatus("Выберите свободное время из сетки.", "is-error");
        var firstSlot = slotsWrap.querySelector(".slot:not(:disabled)");
        if (firstSlot) firstSlot.focus();
        return;
      }

      var lines = [
        "Заявка с сайта ФЛЁР",
        "Имя: " + name,
        "Телефон: " + phone,
        "Услуга: " + service,
        "Мастер: " + master,
        "Дата: " + formatDate(date),
        "Время: " + time
      ];

      var link =
        "https://t.me/" + TELEGRAM + "?text=" + encodeURIComponent(lines.join("\n"));

      /* window.open с "noopener" возвращает null, поэтому открываем
         через временную ссылку — так не бывает ложных ошибок. */
      var opener = document.createElement("a");
      opener.href = link;
      opener.target = "_blank";
      opener.rel = "noopener noreferrer";
      document.body.appendChild(opener);
      opener.click();
      opener.remove();

      setStatus(
        "Готово! Открыли Telegram — осталось нажать «Отправить» в чате.",
        "is-success"
      );

      form.reset();
      if (dateInput) dateInput.value = iso(new Date(Date.now() + 86400000));
      renderSlots(dateInput ? dateInput.value : "");
    });

    form.addEventListener("input", function () {
      if (status && (status.classList.contains("is-error") || status.classList.contains("is-success"))) {
        setStatus(defaultHint, null);
      }
    });
  }

  /* ------------------------------------------------------------ подвал */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
