"use client";

import { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useGroup } from "@/contexts/GroupContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { CategoriesDataSource, ApiError } from "@/datasource";
import {
  LoadingSpinner,
  EmptyState,
  Badge,
  InputField,
  TextareaField,
  Modal,
  SearchInput,
  useSearch,
  PageHeader,
  PageHeaderSkeleton,
  CardGridSkeleton,
} from "@/shared/components";

interface Subcategory {
  name: string;
  description: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
  isDefault?: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const { notifyError, notifyDeleted, notifyAdded, notifyUpdated } =
    useOperationNotification();
  const { activeGroup } = useGroup();
  const confirmation = useConfirmation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subcategories: [{ name: "", description: "" }],
  });

  // Search functionality using shared hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData: filteredCategories,
  } = useSearch({
    data: categories,
    searchFields: ["name", "description"],
    debounceMs: 300,
    customFilter: (category, query) => {
      const lowerQuery = query.toLowerCase();
      // Search in category name and description
      if (category.name.toLowerCase().includes(lowerQuery)) return true;
      if (category.description.toLowerCase().includes(lowerQuery)) return true;
      // Also search in subcategory names
      return category.subcategories.some(
        (sub) =>
          sub.name.toLowerCase().includes(lowerQuery) ||
          sub.description.toLowerCase().includes(lowerQuery)
      );
    },
  });

  // Fetch categories via datasource layer
  const fetchCategories = useCallback(async () => {
    if (!activeGroup?._id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const data = await CategoriesDataSource.getCategories(activeGroup._id);
      setCategories(data as Category[]);
    } catch {
      // Error handled by UI
    } finally {
      setLoading(false);
    }
  }, [activeGroup?._id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDropdownId && !target.closest(".dropdown")) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  // Create or update category via datasource layer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeGroup?._id) {
      notifyError("Create", "No active group selected");
      return;
    }

    setOperationLoading(true);

    try {
      if (editingCategory) {
        await CategoriesDataSource.updateCategory(
          activeGroup._id,
          editingCategory._id,
          { _id: editingCategory._id, ...formData }
        );
      } else {
        await CategoriesDataSource.createCategory(activeGroup._id, formData);
      }

      // Close modal and reset form
      setShowModal(false);
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        subcategories: [{ name: "", description: "" }],
      });

      // Refresh the categories list
      await fetchCategories();

      // Show success notification
      if (editingCategory) {
        notifyUpdated("Category");
      } else {
        notifyAdded("Category");
      }
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : `Failed to ${editingCategory ? "update" : "save"} category`;
      notifyError(editingCategory ? "Update" : "Create", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      subcategories:
        category.subcategories.length > 0
          ? category.subcategories
          : [{ name: "", description: "" }],
    });
    setShowModal(true);
  };

  // Delete category via datasource layer
  const handleDelete = async (categoryId: string) => {
    const confirmed = await confirmation.confirm({
      title: "Delete Category",
      message:
        "Are you sure you want to delete this category? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    if (!activeGroup?._id) {
      notifyError("Delete", "No active group selected");
      return;
    }

    setOperationLoading(true);

    try {
      await CategoriesDataSource.deleteCategory(activeGroup._id, categoryId);

      // Refresh the categories list
      await fetchCategories();

      // Show success notification
      notifyDeleted("Category");
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Failed to delete category";
      notifyError("Delete", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const addSubcategory = () => {
    setFormData({
      ...formData,
      subcategories: [...formData.subcategories, { name: "", description: "" }],
    });
  };

  const removeSubcategory = (index: number) => {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.filter((_, i) => i !== index),
    });
  };

  const updateSubcategory = (
    index: number,
    field: keyof Subcategory,
    value: string
  ) => {
    const updated = formData.subcategories.map((sub, i) =>
      i === index ? { ...sub, [field]: value } : sub
    );
    setFormData({ ...formData, subcategories: updated });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="row">
          <div className="col-12">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={6} columns={3} hasHeader hasSubitems />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <PageHeader
            title="Categories"
            icon="bi bi-tags"
            actions={
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({
                    name: "",
                    description: "",
                    subcategories: [{ name: "", description: "" }],
                  });
                  setShowModal(true);
                }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add Category
              </button>
            }
          />

          {/* Search Input - Audit: Categories grid search */}
          {categories.length > 0 && (
            <div className="mb-4">
              <div className="row">
                <div className="col-md-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search categories or subcategories..."
                    ariaLabel="Search categories"
                  />
                </div>
                {searchQuery && (
                  <div className="col-12 mt-2">
                    <small className="text-muted">
                      Showing {filteredCategories.length} of {categories.length}{" "}
                      categories
                    </small>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="row">
            {filteredCategories.length === 0 && !loading ? (
              <div className="col-12">
                {searchQuery ? (
                  <EmptyState
                    icon="🔍"
                    title="No Categories Found"
                    description={`No categories match "${searchQuery}". Try a different search term.`}
                    size="medium"
                    actions={[
                      {
                        label: "Clear Search",
                        onClick: () => setSearchQuery(""),
                        variant: "secondary",
                        icon: "x-circle",
                      },
                    ]}
                  />
                ) : (
                  <EmptyState
                    icon="🏷️"
                    title="No Categories Yet"
                    description="Create your first category to organize and track your expenses."
                    size="large"
                    actions={[
                      {
                        label: "Create Category",
                        onClick: () => {
                          setFormData({
                            name: "",
                            description: "",
                            subcategories: [],
                          });
                          setEditingCategory(null);
                          setShowModal(true);
                        },
                        variant: "primary",
                        icon: "plus",
                      },
                    ]}
                  />
                )}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category._id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <h5
                          className="mb-0"
                          aria-label={category.name || "Category"}
                        >
                          {category.name}
                        </h5>
                        {category.isDefault && (
                          <span
                            className="badge bg-secondary"
                            title="Default category — visible to all groups"
                          >
                            Default
                          </span>
                        )}
                      </div>
                      {!category.isDefault && (
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-outline-secondary dropdown-toggle"
                            type="button"
                            id={`category-dropdown-${category._id}`}
                            data-bs-toggle="dropdown"
                            aria-label={`Actions for ${category.name}`}
                            onClick={() =>
                              setOpenDropdownId(
                                openDropdownId === category._id
                                  ? null
                                  : category._id
                              )
                            }
                          >
                            <i className="bi bi-three-dots"></i>
                          </button>
                          <ul
                            className={`dropdown-menu ${openDropdownId === category._id ? "show" : ""}`}
                            aria-labelledby={`category-dropdown-${category._id}`}
                          >
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  handleEdit(category);
                                  setOpenDropdownId(null);
                                }}
                              >
                                <i className="bi bi-pencil me-2"></i> Edit
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => {
                                  handleDelete(category._id);
                                  setOpenDropdownId(null);
                                }}
                              >
                                <i className="bi bi-trash me-2"></i> Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <p className="card-text text-muted mb-3">
                        {category.description}
                      </p>
                      {category.subcategories &&
                        category.subcategories.length > 0 && (
                          <div>
                            <h6 className="mb-2">Subcategories:</h6>
                            <div className="d-flex flex-wrap gap-1">
                              {category.subcategories.map((sub, index) => (
                                <Badge key={index} variant="secondary">
                                  {sub.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? "Edit Category" : "Add Category"}
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center"
              disabled={operationLoading}
              form="category-form"
              aria-label={
                editingCategory ? "Update category" : "Create category"
              }
              style={{ minWidth: "100px" }}
            >
              {operationLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  {editingCategory ? "Updating..." : "Creating..."}
                </>
              ) : editingCategory ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        }
      >
        <form id="category-form" onSubmit={handleSubmit}>
          <InputField
            label="Name"
            type="text"
            value={formData.name}
            onChange={(value) =>
              setFormData({ ...formData, name: value as string })
            }
            required
            placeholder="Enter category name"
          />

          <TextareaField
            label="Description"
            value={formData.description}
            onChange={(value) =>
              setFormData({ ...formData, description: value as string })
            }
            required
            placeholder="Enter category description"
            rows={3}
          />

          <div
            className="mb-3"
            role="group"
            aria-labelledby="subcategories-label"
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="form-label mb-0" id="subcategories-label">
                Subcategories
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addSubcategory}
              >
                <i className="bi bi-plus"></i> Add
              </button>
            </div>

            {formData.subcategories.map((sub, index) => (
              <div key={index} className="row g-2 mb-2 align-items-end">
                <div className="col-12 col-sm-5">
                  <InputField
                    label=""
                    type="text"
                    value={sub.name}
                    onChange={(value) =>
                      updateSubcategory(index, "name", value as string)
                    }
                    placeholder="Name"
                    size="sm"
                  />
                </div>
                <div className="col-10 col-sm-5">
                  <InputField
                    label=""
                    type="text"
                    value={sub.description}
                    onChange={(value) =>
                      updateSubcategory(index, "description", value as string)
                    }
                    placeholder="Description"
                    size="sm"
                  />
                </div>
                <div className="col-2 col-sm-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeSubcategory(index)}
                    disabled={formData.subcategories.length === 1}
                    aria-label="Remove subcategory"
                    style={{ minWidth: "38px", minHeight: "38px" }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.config?.title || ""}
        message={confirmation.config?.message || ""}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        type={confirmation.config?.type}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {operationLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "var(--overlay-light)",
            zIndex: 9999,
            backdropFilter: "blur(1px)",
          }}
        >
          <div className="processing-popup rounded p-3 shadow">
            <div className="d-flex align-items-center">
              <LoadingSpinner config={{ size: "small", showText: false }} />
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dropdown:hover .dropdown-menu,
        .dropdown.show .dropdown-menu {
          z-index: 1050 !important;
          position: absolute !important;
        }
        .card:hover {
          z-index: 10;
          position: relative;
        }
        .dropdown-menu {
          z-index: 1050 !important;
        }
      `}</style>
    </MainLayout>
  );
}
