document.addEventListener("DOMContentLoaded", function () {
    const cardNumberInputs = document.querySelectorAll("#card-number");
    const cardHolderInput = document.getElementById("card-holder");
    const cardExpirationMonthSelect = document.getElementById("card-expiration-month");
    const cardExpirationYearSelect = document.getElementById("card-expiration-year");
    const cardCCVInput = document.getElementById("card-ccv");

    cardNumberInputs.forEach(function (input, index) {
        input.addEventListener("input", function () {
            formatCardNumber(input, index);
            updateCardNumber();
        });
    });

    cardHolderInput.addEventListener("input", function () {
        updateCardHolder();
    });

    cardExpirationMonthSelect.addEventListener("change", updateCardExpirationDate);
    cardExpirationYearSelect.addEventListener("change", updateCardExpirationDate);

    cardCCVInput.addEventListener("input", function () {
        updateCardCCV();
    });

    function formatCardNumber(input, currentIndex) {
        let cardNumber = input.value.replace(/\D/g, '');
        cardNumber = cardNumber.slice(0, 19);
        cardNumber = cardNumber.replace(/(.{4})/g, '$1 ');
        input.value = cardNumber;

        if (cardNumber.length === 5 && currentIndex < cardNumberInputs.length - 1) {
            cardNumberInputs[currentIndex + 1].focus();
        }
    }

    function updateCardNumber() {
        let cardNumber = "";
        cardNumberInputs.forEach(function (input) {
            cardNumber += input.value.padEnd(19, "•") + " ";
        });
        document.querySelector(".number").textContent = cardNumber.trim();
    }

    function updateCardHolder() {
        const cardHolder = cardHolderInput.value || "CARD HOLDER";
        document.querySelector(".card-holder div").textContent = cardHolder.toUpperCase();
    }

    function updateCardExpirationDate() {
        const expirationMonth = cardExpirationMonthSelect.value.padStart(2, '0') || "MM";
        const expirationYear = cardExpirationYearSelect.value.slice(-2) || "YY";
        document.querySelector(".card-expiration-date div").textContent = `${expirationMonth}/${expirationYear}`;
    }

    function updateCardCCV() {
        const ccv = cardCCVInput.value || "CVV";
        document.querySelector(".ccv div").textContent = ccv;
    }
});