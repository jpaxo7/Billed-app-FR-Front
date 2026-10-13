/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import $ from "jquery";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the mail icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        }),
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");
      expect(mailIcon.classList.contains("active-icon")).toBe(true);
    });

    test("Then the new bill form should be displayed with its fields", () => {
      document.body.innerHTML = NewBillUI();
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });
    describe("When I upload a file", () => {
      test("Then a valid image file (jpg) should be accepted and sent to the store", async () => {
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          }),
        );
        document.body.innerHTML = NewBillUI();
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBillContainer = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });
        const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
        const fileInput = screen.getByTestId("file");
        fileInput.addEventListener("change", handleChangeFile);
        const validFile = new File(["img"], "photo.jpg", {
          type: "image/jpeg",
        });
        fireEvent.change(fileInput, {
          target: { files: [validFile] },
        });
        expect(handleChangeFile).toHaveBeenCalled();
        await waitFor(() =>
          expect(newBillContainer.fileName).toBe("photo.jpg"),
        );
        expect(newBillContainer.fileUrl).not.toBeNull();
      });

      test("Then an invalid file (pdf) should be rejected and not sent to the store", () => {
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          }),
        );
        document.body.innerHTML = NewBillUI();
        const createSpy = jest.spyOn(mockStore.bills(), "create");
        jest.spyOn(window, "alert").mockImplementation(() => {});
        const newBillContainer = new NewBill({
          document,
          onNavigate: null,
          store: mockStore,
          localStorage: window.localStorage,
        });
        const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
        const fileInput = screen.getByTestId("file");
        fileInput.addEventListener("change", handleChangeFile);
        const invalidFile = new File(["doc"], "document.pdf", {
          type: "application/pdf",
        });
        fireEvent.change(fileInput, {
          target: { files: [invalidFile] },
        });
        expect(handleChangeFile).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
        expect(fileInput.value).toBe("");
        expect(createSpy).not.toHaveBeenCalled();
        expect(newBillContainer.fileName).toBeNull();
      });
    });
    describe("When I submit the form with valid data", () => {
      test("Then the bill should be created and I should be sent to Bills page", () => {
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          }),
        );
        document.body.innerHTML = NewBillUI();
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBillContainer = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });
        const updateBill = jest.fn(newBillContainer.updateBill);
        newBillContainer.updateBill = updateBill;
        const handleSubmit = jest.fn(newBillContainer.handleSubmit);
        const form = screen.getByTestId("form-new-bill");
        form.addEventListener("submit", handleSubmit);

        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Vol Paris Marseille";
        screen.getByTestId("datepicker").value = "2026-08-13";
        screen.getByTestId("amount").value = "120";
        screen.getByTestId("vat").value = "20";
        screen.getByTestId("pct").value = "10";
        screen.getByTestId("commentary").value = "Déplacement client";

        fireEvent.submit(form);

        expect(handleSubmit).toHaveBeenCalled();
        expect(updateBill).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "Transports",
            name: "Vol Paris Marseille",
            date: "2026-08-13",
            amount: 120,
            pct: 10,
            status: "pending",
          }),
        );
        expect(screen.getByText("Mes notes de frais")).toBeTruthy();
      });
    });
  });
});

// test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  describe("When I submit a new bill", () => {
    test("Then the bill is created via the mock API POST", async () => {
      const createdBill = await mockStore.bills().create({
        data: {},
        headers: { noContentType: true },
      });
      expect(createdBill.key).toBe("1234");
      expect(createdBill.fileUrl).toBe(
        "https://localhost:3456/images/test.jpg",
      );
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        document.body.innerHTML = "";
        jest.spyOn(mockStore, "bills");
        jest.spyOn(console, "error").mockImplementation(() => {});
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          }),
        );
      });

      test("Then it fails with a 404 error and the error is logged", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            create: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        document.body.innerHTML = NewBillUI();
        const newBillContainer = new NewBill({
          document,
          onNavigate: null,
          store: mockStore,
          localStorage: window.localStorage,
        });
        const fileInput = screen.getByTestId("file");
        const validFile = new File(["img"], "photo.jpg", {
          type: "image/jpeg",
        });
        fireEvent.change(fileInput, {
          target: { files: [validFile] },
        });
        await new Promise(process.nextTick);
        expect(console.error).toHaveBeenCalledWith(new Error("Erreur 404"));
      });

      test("Then it fails with a 500 error and the error is logged", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            create: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });
        document.body.innerHTML = NewBillUI();
        const newBillContainer = new NewBill({
          document,
          onNavigate: null,
          store: mockStore,
          localStorage: window.localStorage,
        });
        const fileInput = screen.getByTestId("file");
        const validFile = new File(["img"], "photo.jpg", {
          type: "image/jpeg",
        });
        fireEvent.change(fileInput, {
          target: { files: [validFile] },
        });
        await new Promise(process.nextTick);
        expect(console.error).toHaveBeenCalledWith(new Error("Erreur 500"));
      });
    });
  });
});
