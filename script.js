/* script.js */

document.addEventListener('DOMContentLoaded', () => {
    const expressionDisplay = document.getElementById('expression-display');
    const currentDisplay = document.getElementById('current-display');
    const buttons = document.querySelectorAll('.btn');

    let expression = [];
    let currentInput = '';
    let isResultMode = false;
    let previousResult = null;

    // Helper function to check if a token is a binary operator
    function isOperator(val) {
        return ['+', '-', '*', '/'].includes(val);
    }

    // Main render function to synchronize state with the UI
    function updateDisplay() {
        expressionDisplay.textContent = formatExpression(expression);

        let displayText = currentInput;
        if (displayText === '') {
            // Default display fallback
            displayText = isResultMode && previousResult !== null ? previousResult.toString() : '0';
        }

        // Correct minus rendering in UI display
        if (displayText === '-') {
            currentDisplay.textContent = '-';
        } else {
            currentDisplay.textContent = displayText;
        }

        // Premium feature: scale font-size programmatically to prevent layout break
        const len = displayText.length;
        if (len <= 8) {
            currentDisplay.style.fontSize = '2.8rem';
        } else if (len <= 12) {
            currentDisplay.style.fontSize = '2.2rem';
        } else if (len <= 16) {
            currentDisplay.style.fontSize = '1.7rem';
        } else {
            currentDisplay.style.fontSize = '1.3rem';
        }
    }

    // Format expression array to match visual presentation operators
    function formatExpression(exprArray) {
        return exprArray.map(token => {
            if (token === '*') return '×';
            if (token === '/') return '÷';
            if (token === '-') return '−';
            return token;
        }).join(' ');
    }

    // Handles digit key entries
    function handleNumber(num) {
        if (isResultMode) {
            // Clear previous calculations and start fresh
            currentInput = num;
            isResultMode = false;
            previousResult = null;
        } else {
            // Avoid multiple leading zeros
            if (currentInput === '0' && num === '0') return;
            if (currentInput === '0') {
                currentInput = num;
            } else {
                currentInput += num;
            }
        }
        updateDisplay();
    }

    // Handles decimals
    function handleDecimal() {
        if (isResultMode) {
            currentInput = '0.';
            isResultMode = false;
            previousResult = null;
        } else {
            if (currentInput.includes('.')) return; // Prevent multiple decimal points in a single term
            if (currentInput === '' || currentInput === '-') {
                currentInput += '0.';
            } else {
                currentInput += '.';
            }
        }
        updateDisplay();
    }

    // Handles binary operators (+, -, *, /)
    function handleOperator(op) {
        if (isResultMode && previousResult !== null) {
            // Chain next operation directly to the result of the previous expression
            expression = [previousResult.toString(), op];
            currentInput = '';
            isResultMode = false;
        } else if (currentInput !== '' && currentInput !== '-') {
            expression.push(currentInput);
            expression.push(op);
            currentInput = '';
        } else if (expression.length > 0) {
            // Allow user to change operator on the fly
            if (isOperator(expression[expression.length - 1])) {
                expression[expression.length - 1] = op;
            }
        } else {
            // If empty, insert 0 as base operand
            expression.push('0');
            expression.push(op);
        }
        updateDisplay();
    }

    // Handles instant percentage calculations
    function handlePercent() {
        if (isResultMode && previousResult !== null) {
            const val = parseFloat(previousResult);
            if (!isNaN(val)) {
                previousResult = parseFloat((val / 100).toFixed(10));
            }
        } else if (currentInput !== '' && currentInput !== '-') {
            const val = parseFloat(currentInput);
            if (!isNaN(val)) {
                currentInput = parseFloat((val / 100).toFixed(10)).toString();
            }
        }
        updateDisplay();
    }

    // Handles positive/negative toggles
    function handleNegate() {
        if (isResultMode && previousResult !== null) {
            previousResult = parseFloat((-previousResult).toFixed(10));
        } else if (currentInput !== '') {
            if (currentInput === '-') {
                currentInput = '';
            } else if (currentInput.startsWith('-')) {
                currentInput = currentInput.slice(1);
            } else {
                currentInput = '-' + currentInput;
            }
        } else {
            currentInput = '-';
        }
        updateDisplay();
    }

    // Handles character deletion (backspace) with smart expression undo
    function handleDelete() {
        if (isResultMode) {
            handleClear();
        } else if (currentInput !== '') {
            currentInput = currentInput.slice(0, -1);
        } else if (expression.length > 0) {
            const lastItem = expression.pop();
            if (isOperator(lastItem)) {
                const prevNum = expression.pop();
                if (prevNum) {
                    currentInput = prevNum;
                }
            } else {
                currentInput = lastItem;
            }
        }
        updateDisplay();
    }

    // Handles clearing states (AC)
    function handleClear() {
        expression = [];
        currentInput = '';
        previousResult = null;
        isResultMode = false;
        updateDisplay();
    }

    // Prepares and initiates expression evaluation
    function handleEquals() {
        if (currentInput !== '' && currentInput !== '-') {
            expression.push(currentInput);
            currentInput = '';
        }

        if (expression.length === 0) return;

        // Strip trailing operator for calculation validity
        while (expression.length > 0 && isOperator(expression[expression.length - 1])) {
            expression.pop();
        }

        if (expression.length === 0) {
            updateDisplay();
            return;
        }

        const fullExprString = formatExpression(expression) + ' =';

        try {
            const result = evaluateExpression([...expression]);
            previousResult = result;
            expressionDisplay.textContent = fullExprString;
            currentDisplay.textContent = result.toString();
            isResultMode = true;
            expression = [];
            currentInput = '';
            
            // Re-apply responsive result font size
            const len = result.toString().length;
            if (len <= 8) {
                currentDisplay.style.fontSize = '2.8rem';
            } else if (len <= 12) {
                currentDisplay.style.fontSize = '2.2rem';
            } else if (len <= 16) {
                currentDisplay.style.fontSize = '1.7rem';
            } else {
                currentDisplay.style.fontSize = '1.3rem';
            }
        } catch (error) {
            expressionDisplay.textContent = fullExprString;
            if (error.message === 'ZeroDivision') {
                currentDisplay.textContent = 'Error: Div by 0';
            } else {
                currentDisplay.textContent = 'Error';
            }
            isResultMode = true;
            expression = [];
            currentInput = '';
            previousResult = null;
        }
    }

    // Evaluates expression list using basic algebraic priority (pass-based math engine)
    function evaluateExpression(tokens) {
        if (tokens.length === 0) return 0;
        
        let parsedTokens = tokens.map(token => {
            if (isOperator(token)) return token;
            const val = parseFloat(token);
            if (isNaN(val)) return 0;
            return val;
        });

        // Pass 1: Handle high precedence (*, /)
        let i = 0;
        while (i < parsedTokens.length) {
            const token = parsedTokens[i];
            if (token === '*' || token === '/') {
                if (i === 0 || i === parsedTokens.length - 1) {
                    throw new Error("Invalid Format");
                }
                const op1 = parsedTokens[i - 1];
                const op2 = parsedTokens[i + 1];
                
                if (typeof op1 !== 'number' || typeof op2 !== 'number') {
                    throw new Error("Invalid Format");
                }
                
                let res;
                if (token === '/') {
                    if (op2 === 0) {
                        throw new Error("ZeroDivision");
                    }
                    res = op1 / op2;
                } else {
                    res = op1 * op2;
                }
                
                parsedTokens.splice(i - 1, 3, res);
                i = i - 1; // Align pointer index back to evaluated result
            } else {
                i++;
            }
        }

        // Pass 2: Handle low precedence (+, -)
        i = 0;
        while (i < parsedTokens.length) {
            const token = parsedTokens[i];
            if (token === '+' || token === '-') {
                if (i === 0 || i === parsedTokens.length - 1) {
                    throw new Error("Invalid Format");
                }
                const op1 = parsedTokens[i - 1];
                const op2 = parsedTokens[i + 1];
                
                if (typeof op1 !== 'number' || typeof op2 !== 'number') {
                    throw new Error("Invalid Format");
                }
                
                let res = token === '+' ? op1 + op2 : op1 - op2;
                parsedTokens.splice(i - 1, 3, res);
                i = i - 1;
            } else {
                i++;
            }
        }

        if (parsedTokens.length !== 1 || typeof parsedTokens[0] !== 'number') {
            throw new Error("Invalid Format");
        }

        // Round off to mitigate standard JavaScript floating point bugs
        return parseFloat(parsedTokens[0].toFixed(10));
    }

    // Attach click listeners to all buttons
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const val = btn.dataset.val;

            switch (action) {
                case 'number':
                    handleNumber(val);
                    break;
                case 'decimal':
                    handleDecimal();
                    break;
                case 'operator':
                    handleOperator(val);
                    break;
                case 'percent':
                    handlePercent();
                    break;
                case 'negate':
                    handleNegate();
                    break;
                case 'delete':
                    handleDelete();
                    break;
                case 'clear':
                    handleClear();
                    break;
                case 'equals':
                    handleEquals();
                    break;
            }
        });
    });

    // Handle user keyboard shortcuts and link them to UI buttons
    document.addEventListener('keydown', (e) => {
        let key = e.key;
        let btn = null;

        if (key >= '0' && key <= '9') {
            btn = document.querySelector(`.btn[data-action="number"][data-val="${key}"]`);
        } else if (key === '+') {
            btn = document.querySelector(`.btn[data-action="operator"][data-val="+"]`);
        } else if (key === '-') {
            btn = document.querySelector(`.btn[data-action="operator"][data-val="-"]`);
        } else if (key === '*') {
            btn = document.querySelector(`.btn[data-action="operator"][data-val="*"]`);
        } else if (key === '/') {
            btn = document.querySelector(`.btn[data-action="operator"][data-val="/"]`);
        } else if (key === '%') {
            btn = document.querySelector(`.btn[data-action="percent"]`);
        } else if (key === '.') {
            btn = document.querySelector(`.btn[data-action="decimal"]`);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            btn = document.querySelector(`.btn[data-action="equals"]`);
        } else if (key === 'Backspace') {
            btn = document.querySelector(`.btn[data-action="delete"]`);
        } else if (key === 'Escape') {
            btn = document.querySelector(`.btn[data-action="clear"]`);
        }

        if (btn) {
            btn.click();
            btn.classList.add('keyboard-active');
            setTimeout(() => {
                btn.classList.remove('keyboard-active');
            }, 100);
        }
    });

    // Initialize UI display
    updateDisplay();
});
