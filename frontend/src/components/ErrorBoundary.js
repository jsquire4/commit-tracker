import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ST6 Commit Module error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { className: "p-8 text-center", children: [_jsx("h2", { className: "text-xl font-bold text-red-600", children: "Something went wrong" }), _jsx("p", { className: "mt-2 text-gray-600", children: this.state.error?.message })] }));
        }
        return this.props.children;
    }
}
