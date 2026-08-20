"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal,
  Truck, Archive,
} from "lucide-react";
import { api } from "@/lib/client";
import { ghs, fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { PhoneField } from "@/components/admin/validated-field";
import { useToast } from "@/components/ui/toast";

type Item = {
  id: string; name: string; sku: string | null; category: string | null; unit: string | null;
  quantity: number; reorderLevel: number; unitCost: number; location: string | null;
  supplier: { name: string } | null; status: string; createdAt: string;
};
type Movement = {
  id: string; type: string; quantity: number; note: string | null; createdAt: string;
  item: { name: string; sku: string | null; unit: string | null };
};
type Supplier = { id: string; name: string; contact: string | null; phone: string | null; category: string | null; status: string };

const CATEGORIES = ["STATIONERY", "SPORTS", "LAB", "FURNITURE", "ICT", "FOOD", "OTHER"];

const itemTone = (s: string) => (s === "ACTIVE" ? "green" : s === "LOW" ? "amber" : s === "OUT" ? "red" : "slate") as "green" | "amber" | "red" | "slate";
const moveTone = (t: string) => (t === "IN" ? "green" : t === "OUT" ? "red" : "blue") as "green" | "red" | "blue";

export default function InventoryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"items" | "movements" | "suppliers">("items");
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);

  const [itemModal, setItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", category: "STATIONERY", unit: "pieces", quantity: "0", reorderLevel: "0", unitCost: "0", location: "", supplierId: "" });

  const [stockModal, setStockModal] = useState<Item | null>(null);
  const [stockForm, setStockForm] = useState({ type: "IN", quantity: "", unitCost: "", note: "" });

  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact: "", phone: "", category: "STATIONERY" });

  const load = useCallback(async () => {
    try {
      const [i, m, s] = await Promise.all([
        api<Item[]>("/api/inventory/items"),
        api<Movement[]>("/api/inventory/movements"),
        api<Supplier[]>("/api/inventory/suppliers"),
      ]);
      setItems(i);
      setMovements(m);
      setSuppliers(s);
    } catch (e) {
      toast.toast({ title: "Failed to load inventory", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          ...itemForm,
          quantity: Number(itemForm.quantity),
          reorderLevel: Number(itemForm.reorderLevel),
          unitCost: Number(itemForm.unitCost),
          supplierId: itemForm.supplierId || undefined,
        }),
      });
      toast.toast({ title: "Item added", variant: "success" });
      setItemModal(false);
      setItemForm({ name: "", sku: "", category: "STATIONERY", unit: "pieces", quantity: "0", reorderLevel: "0", unitCost: "0", location: "", supplierId: "" });
      load();
    } catch (e) {
      toast.toast({ title: "Add failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function recordMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!stockModal) return;
    setSaving(true);
    try {
      await api("/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({
          itemId: stockModal.id,
          type: stockForm.type,
          quantity: Number(stockForm.quantity),
          unitCost: stockForm.type === "IN" && stockForm.unitCost ? Number(stockForm.unitCost) : undefined,
          note: stockForm.note || undefined,
        }),
      });
      toast.toast({ title: "Stock updated", variant: "success" });
      setStockModal(null);
      setStockForm({ type: "IN", quantity: "", unitCost: "", note: "" });
      load();
    } catch (e) {
      toast.toast({ title: "Stock update failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/inventory/suppliers", { method: "POST", body: JSON.stringify(supplierForm) });
      toast.toast({ title: "Supplier added", variant: "success" });
      setSupplierModal(false);
      setSupplierForm({ name: "", contact: "", phone: "", category: "STATIONERY" });
      load();
    } catch (e) {
      toast.toast({ title: "Add failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: Item) {
    if (!confirm(`Delete "${item.name}"? Its movement history will be removed too.`)) return;
    try {
      await api(`/api/inventory/items/${item.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function removeSupplier(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await api(`/api/inventory/suppliers/${s.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const stockValue = items.reduce((a, i) => a + i.quantity * i.unitCost, 0);
  const lowOut = items.filter((i) => i.status !== "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Inventory & Stores"
        subtitle={`${items.length} items · ${ghs(stockValue)} stock value · ${lowOut} low / out of stock`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSupplierModal(true)}><Truck className="h-4 w-4" /> Add Supplier</Button>
            <Button onClick={() => setItemModal(true)}><Package className="h-4 w-4" /> Add Item</Button>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([["items", "Items", Package], ["movements", "Stock Movements", Archive], ["suppliers", "Suppliers", Truck]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Stock value", value: ghs(stockValue), hint: "quantity × unit cost", tone: "text-emerald-700" },
              { label: "Low stock alerts", value: String(lowOut), hint: "at or below reorder level", tone: "text-amber-600" },
              { label: "Items on hand", value: String(items.reduce((a, i) => a + i.quantity, 0)), hint: `${items.length} tracked items`, tone: "text-sky-700" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Category</th><th>In stock</th><th>Reorder</th><th>Unit cost</th><th>Supplier</th><th>Status</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <p className="font-medium text-slate-800">{i.name}</p>
                      <p className="text-xs text-slate-400">{i.sku ?? "—"}{i.location ? ` · ${i.location}` : ""}</p>
                    </td>
                    <td>{i.category ?? "—"}</td>
                    <td className="font-semibold">{i.quantity} <span className="text-xs font-normal text-slate-400">{i.unit ?? ""}</span></td>
                    <td className="text-xs">{i.reorderLevel}</td>
                    <td>{ghs(i.unitCost)}</td>
                    <td className="text-xs">{i.supplier?.name ?? "—"}</td>
                    <td><Badge tone={itemTone(i.status)}>{i.status}</Badge></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setStockModal(i); setStockForm({ type: "IN", quantity: "", unitCost: "", note: "" }); }} title="Add stock" className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"><ArrowDownToLine className="h-4 w-4" /></button>
                        <button onClick={() => { setStockModal(i); setStockForm({ type: "OUT", quantity: "", unitCost: "", note: "" }); }} title="Issue stock" className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"><ArrowUpFromLine className="h-4 w-4" /></button>
                        <button onClick={() => { setStockModal(i); setStockForm({ type: "ADJUST", quantity: String(i.quantity), unitCost: "", note: "" }); }} title="Adjust stock" className="rounded-lg p-2 text-sky-600 transition hover:bg-sky-50"><SlidersHorizontal className="h-4 w-4" /></button>
                        <button onClick={() => removeItem(i)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-400">No items yet — add your first item.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "movements" && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Quantity</th><th>Note</th></tr></thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs">{fmtDateTime(m.createdAt)}</td>
                  <td>
                    <p className="font-medium text-slate-800">{m.item.name}</p>
                    <p className="text-xs text-slate-400">{m.item.sku ?? ""}</p>
                  </td>
                  <td><Badge tone={moveTone(m.type)}>{m.type}</Badge></td>
                  <td className="font-semibold">{m.type === "ADJUST" ? `→ ${m.quantity}` : `${m.type === "IN" ? "+" : "−"}${m.quantity}`} <span className="text-xs font-normal text-slate-400">{m.item.unit ?? ""}</span></td>
                  <td className="text-xs text-slate-500">{m.note ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-400">No movements recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "suppliers" && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Category</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-800">{s.name}</td>
                  <td className="text-xs">{s.contact ?? "—"}</td>
                  <td className="text-xs">{s.phone ?? "—"}</td>
                  <td>{s.category ?? "—"}</td>
                  <td><Badge tone={s.status === "ACTIVE" ? "green" : "slate"}>{s.status}</Badge></td>
                  <td><div className="flex justify-end"><button onClick={() => removeSupplier(s)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {suppliers.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-400">No suppliers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add item */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Add Inventory Item">
        <form onSubmit={addItem} className="space-y-4">
          <Field label="Item name *"><Input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. A4 Exercise Books" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU / Code"><Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="ST-0001" /></Field>
            <Field label="Category">
              <Select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Unit"><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="pieces, boxes…" /></Field>
            <Field label="Quantity"><Input type="number" min="0" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></Field>
            <Field label="Reorder level"><Input type="number" min="0" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })} /></Field>
            <Field label="Unit cost (GHS)"><Input type="number" min="0" step="0.5" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })} /></Field>
          </div>
          <Field label="Storage location"><Input value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} placeholder="Store Room A" /></Field>
          <Field label="Supplier">
            <Select value={itemForm.supplierId} onChange={(e) => setItemForm({ ...itemForm, supplierId: e.target.value })}>
              <option value="">None</option>
              {suppliers.filter((s) => s.status === "ACTIVE").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setItemModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Item</Button>
          </div>
        </form>
      </Modal>

      {/* Stock action */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockModal ? `Stock: ${stockModal.name}` : ""} subtitle={`Current quantity: ${stockModal?.quantity ?? 0} ${stockModal?.unit ?? ""}`}>
        <form onSubmit={recordMovement} className="space-y-4">
          <Field label="Type *">
            <Select value={stockForm.type} onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}>
              <option value="IN">Stock in (purchase / return)</option>
              <option value="OUT">Issue / use stock</option>
              <option value="ADJUST">Set exact quantity (count)</option>
            </Select>
          </Field>
          <Field label={stockForm.type === "ADJUST" ? "New quantity *" : "Quantity *"}>
            <Input required type="number" min="0" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} />
          </Field>
          {stockForm.type === "IN" && (
            <Field label="Unit cost (GHS)"><Input type="number" min="0" step="0.5" value={stockForm.unitCost} onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })} placeholder="Optional — updates item cost" /></Field>
          )}
          <Field label="Note"><Input value={stockForm.note} onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })} placeholder={stockForm.type === "IN" ? "e.g. Order #PO-102" : stockForm.type === "OUT" ? "e.g. Issue to Basic 7" : "e.g. Stock count correction"} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setStockModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Apply</Button>
          </div>
        </form>
      </Modal>

      {/* Add supplier */}
      <Modal open={supplierModal} onClose={() => setSupplierModal(false)} title="Add Supplier">
        <form onSubmit={addSupplier} className="space-y-4">
          <Field label="Supplier name *"><Input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact person"><Input value={supplierForm.contact} onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} /></Field>
            <PhoneField value={supplierForm.phone} onChange={(v) => setSupplierForm({ ...supplierForm, phone: v })} />
          </div>
          <Field label="Category">
            <Select value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSupplierModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
