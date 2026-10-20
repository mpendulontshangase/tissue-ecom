import { ProductForm } from "@/components/product-form";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl tracking-tight">New product</h1>
      <p className="mt-2 text-sm text-bark">Add another carton size, or a different tissue, without a deploy.</p>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
