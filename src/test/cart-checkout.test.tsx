import { render, screen, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CartProvider, useCart } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  const mockSubscription = { unsubscribe: vi.fn() };
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          // Immediately invoke callback with default/mock session
          callback("INITIAL_SESSION", null);
          return { data: { subscription: mockSubscription } };
        }),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  };
});

const mockProduct = {
  id: "prod-1",
  name: "Sagu Keju",
  price: 25000,
  image_url: "",
  description: "Enak",
  is_best_seller: false,
  is_in_stock: true,
  category_id: "cat-1",
  categories: { name: "Dessert", slug: "dessert" }
};

describe("Shopping Cart and Checkout Integration Flows", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  it("should manage cart state successfully (add, update, remove, clear)", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: TestWrapper,
    });

    // Initial state
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);

    // Add to cart
    act(() => {
      result.current.addToCart(mockProduct);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].product.name).toBe("Sagu Keju");
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(25000);

    // Increase quantity
    act(() => {
      result.current.updateQuantity("prod-1", 3);
    });
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(75000);

    // Remove from cart
    act(() => {
      result.current.removeFromCart("prod-1");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("should ensure route transitions can occur successfully with React Router v7 flags", async () => {
    const RouterTestComponent = () => {
      const navigate = useNavigate();
      const { addToCart } = useCart();
      return (
        <div>
          <button
            onClick={() => {
              addToCart(mockProduct);
              navigate("/checkout");
            }}
          >
            Checkout
          </button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <Routes>
          <Route path="/" element={<RouterTestComponent />} />
          <Route path="/checkout" element={<div>Checkout Page Content</div>} />
        </Routes>
      </TestWrapper>
    );

    const btn = screen.getByRole("button", { name: /checkout/i });
    expect(btn).toBeInTheDocument();

    await act(async () => {
      btn.click();
    });

    expect(screen.getByText("Checkout Page Content")).toBeInTheDocument();
  });
});
