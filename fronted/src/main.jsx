import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { createRoot } from "react-dom/client";
import axios from "axios";

import "./style.css";


const API_URL = "http://localhost:5000";

const PAGE_SIZE = 20;


/*
======================================================
SALESFORCE OBJECT CONFIGURATION
======================================================
*/

const OBJECT_CONFIG = {

  accounts: {

    label: "Account",

    pluralLabel: "Accounts",

    fields: [
      "Name",
      "Industry",
      "Phone",
      "Website",
      "Type"
    ],

    required: [
      "Name"
    ]

  },


  opportunities: {

    label: "Opportunity",

    pluralLabel: "Opportunities",

    fields: [
      "Name",
      "StageName",
      "CloseDate",
      "Amount",
      "Type"
    ],

    required: [
      "Name",
      "StageName",
      "CloseDate"
    ]

  },


  leads: {

    label: "Lead",

    pluralLabel: "Leads",

    fields: [
      "FirstName",
      "LastName",
      "Company",
      "Email",
      "Phone"
    ],

    required: [
      "LastName",
      "Company"
    ]

  },


  contacts: {

    label: "Contact",

    pluralLabel: "Contacts",

    fields: [
      "FirstName",
      "LastName",
      "Email",
      "Phone",
      "Title"
    ],

    required: [
      "LastName"
    ]

  },


  cases: {

    label: "Case",

    pluralLabel: "Cases",

    fields: [
      "Subject",
      "Status",
      "Priority",
      "Origin",
      "Description"
    ],

    required: [
      "Subject"
    ]

  }

};


/*
======================================================
CREATE EMPTY FORM
======================================================
*/

const createEmptyForm = (config) => {

  const emptyForm = {};

  config.fields.forEach((field) => {

    emptyForm[field] = "";

  });

  return emptyForm;

};


/*
======================================================
APP
======================================================
*/

function App() {


  /*
  ====================================================
  STATE
  ====================================================
  */

  const [selectedObject, setSelectedObject] =
    useState("accounts");


  const [records, setRecords] =
    useState([]);


  const [form, setForm] =
    useState(
      createEmptyForm(
        OBJECT_CONFIG.accounts
      )
    );


  const [editingId, setEditingId] =
    useState(null);


  const [viewingRecord, setViewingRecord] =
    useState(null);


  const [loading, setLoading] =
    useState(false);


  const [message, setMessage] =
    useState("");


  const [authenticated, setAuthenticated] =
    useState(false);


  const [authChecking, setAuthChecking] =
    useState(true);


  /*
  ====================================================
  PAGINATION STATE
  ====================================================
  */

  const [currentPage, setCurrentPage] =
    useState(1);


  const [totalPages, setTotalPages] =
    useState(1);


  const [totalRecords, setTotalRecords] =
    useState(0);


  /*
  ====================================================
  LOAD MORE PROTECTION
  ====================================================
  */

  const loadingMoreRef =
    useRef(false);


  /*
  ====================================================
  CURRENT CONFIG
  ====================================================
  */

  const config =
    OBJECT_CONFIG[selectedObject];


  /*
  ====================================================
  CHECK AUTHENTICATION
  ====================================================
  */

  const checkAuthentication =
    useCallback(async () => {

      try {

        setAuthChecking(true);

        const response =
          await axios.get(
            `${API_URL}/auth/status`
          );

        setAuthenticated(
          response.data.authenticated === true
        );

      } catch (error) {

        console.error(
          "Authentication status error:",
          error
        );

        setAuthenticated(false);

      } finally {

        setAuthChecking(false);

      }

    }, []);


  /*
  ====================================================
  LOGIN
  ====================================================
  */

  const loginSalesforce = () => {

    window.location.href =
      `${API_URL}/auth/login`;

  };


  /*
  ====================================================
  RESET FORM
  ====================================================
  */

  const resetForm =
    useCallback(() => {

      setForm(
        createEmptyForm(config)
      );

      setEditingId(null);

    }, [config]);


  /*
  ====================================================
  LOGOUT
  ====================================================
  */

  const logoutSalesforce =
    async () => {

      try {

        await axios.get(
          `${API_URL}/auth/logout`
        );


        setAuthenticated(false);

        setRecords([]);

        setCurrentPage(1);

        setTotalPages(1);

        setTotalRecords(0);

        resetForm();

        setViewingRecord(null);

        setMessage(
          "Logged out from Salesforce."
        );


      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        setMessage(
          "Logout failed."
        );

      }

    };


  /*
  ====================================================
  FETCH RECORDS
  ====================================================

  append = false
  ----------------
  Replace current records.

  append = true
  -------------
  Add next 20 records to existing records.
  */

  const fetchRecords =
    useCallback(
      async (
        page = 1,
        append = false
      ) => {

        if (!authenticated) {

          return;

        }


        /*
        ----------------------------------------------
        PREVENT DUPLICATE LOAD-MORE REQUESTS
        ----------------------------------------------
        */

        if (
          append &&
          loadingMoreRef.current
        ) {

          return;

        }


        try {

          setLoading(true);

          setMessage("");


          if (append) {

            loadingMoreRef.current = true;

          }


          console.log(
            "======================================"
          );

          console.log(
            `Fetching ${selectedObject}, page ${page}`
          );


          /*
          --------------------------------------------
          BACKEND REQUEST
          --------------------------------------------

          Example:

          /api/accounts?page=1

          /api/accounts?page=2

          --------------------------------------------
          */

          const response =
            await axios.get(

              `${API_URL}/api/${selectedObject}`,

              {
                params: {
                  page: page
                }
              }

            );


          /*
          --------------------------------------------
          SUCCESS
          --------------------------------------------
          */

          if (
            response.data.success
          ) {


            const newRecords =
              response.data.records || [];


            /*
            ------------------------------------------
            RECORDS
            ------------------------------------------
            */

            if (append) {

              setRecords(
                previousRecords => [
                  ...previousRecords,
                  ...newRecords
                ]
              );

            } else {

              setRecords(
                newRecords
              );

            }


            /*
            ------------------------------------------
            TOTAL RECORDS
            ------------------------------------------
            */

            const total =
              Number(
                response.data.totalSize || 0
              );


            setTotalRecords(
              total
            );


            /*
            ------------------------------------------
            PAGE SIZE
            ------------------------------------------
            */

            const backendPageSize =
              Number(
                response.data.pageSize ||
                PAGE_SIZE
              );


            /*
            ------------------------------------------
            TOTAL PAGES
            ------------------------------------------
            */

            let pages =
              Number(
                response.data.totalPages
              );


            if (
              !Number.isFinite(pages) ||
              pages < 1
            ) {

              pages =
                Math.max(
                  1,
                  Math.ceil(
                    total /
                    backendPageSize
                  )
                );

            }


            setTotalPages(
              pages
            );


            /*
            ------------------------------------------
            CURRENT PAGE
            ------------------------------------------
            */

            setCurrentPage(
              Number(
                response.data.page || page
              )
            );


            /*
            ------------------------------------------
            DEBUG
            ------------------------------------------
            */

            console.log(
              "PAGE:",
              response.data.page || page
            );

            console.log(
              "PAGE SIZE:",
              backendPageSize
            );

            console.log(
              "TOTAL RECORDS:",
              total
            );

            console.log(
              "TOTAL PAGES:",
              pages
            );

            console.log(
              "RECORDS RECEIVED:",
              newRecords.length
            );

            console.log(
              "APPEND:",
              append
            );

            console.log(
              "======================================"
            );


          } else {

            setMessage(
              response.data.error ||
              "Failed to fetch records."
            );

          }


        } catch (error) {

          console.error(
            "Fetch records error:",
            error
          );


          if (
            error.response?.status === 401
          ) {

            setAuthenticated(false);

            setMessage(
              "Please authenticate with Salesforce first."
            );


          } else {

            setMessage(
              error.response?.data?.error ||
              "Failed to fetch records."
            );

          }


        } finally {

          setLoading(false);

          loadingMoreRef.current = false;

        }

      },

      [
        authenticated,
        selectedObject
      ]

    );


  /*
  ====================================================
  LOAD NEXT PAGE
  ====================================================
  */

  const loadNextPage =
    useCallback(() => {

      if (!authenticated) {

        return;

      }


      if (loading) {

        return;

      }


      if (loadingMoreRef.current) {

        return;

      }


      if (
        currentPage >= totalPages
      ) {

        return;

      }


      const nextPageNumber =
        currentPage + 1;


      console.log(
        "Loading next page:",
        nextPageNumber
      );


      fetchRecords(
        nextPageNumber,
        true
      );


    }, [

      authenticated,
      loading,
      currentPage,
      totalPages,
      fetchRecords

    ]);


  /*
  ====================================================
  INFINITE SCROLL
  ====================================================

  Assignment requirement:

  "on scroll end, load the next 20 records"
  */

  useEffect(() => {

    if (!authenticated) {

      return;

    }


    const handleScroll =
      () => {

        const scrollPosition =
          window.innerHeight +
          window.scrollY;


        const documentHeight =
          document.documentElement.scrollHeight;


        /*
        ----------------------------------------------
        LOAD WHEN USER IS CLOSE TO BOTTOM
        ----------------------------------------------
        */

        const nearBottom =
          scrollPosition >=
          documentHeight - 250;


        if (nearBottom) {

          loadNextPage();

        }

      };


    window.addEventListener(
      "scroll",
      handleScroll
    );


    return () => {

      window.removeEventListener(
        "scroll",
        handleScroll
      );

    };

  }, [

    authenticated,
    loadNextPage

  ]);


  /*
  ====================================================
  GO TO TOP
  ====================================================
  */

  const scrollToTop = () => {

    window.scrollTo({

      top: 0,

      behavior: "smooth"

    });

  };


  /*
  ====================================================
  CHANGE OBJECT
  ====================================================
  */

  const handleObjectChange =
    (event) => {

      const newObject =
        event.target.value;


      setSelectedObject(
        newObject
      );


      /*
      ----------------------------------------------
      RESET RECORDS
      ----------------------------------------------
      */

      setRecords([]);

      setCurrentPage(1);

      setTotalPages(1);

      setTotalRecords(0);


      /*
      ----------------------------------------------
      RESET FORM
      ----------------------------------------------
      */

      setEditingId(null);

      setViewingRecord(null);

      setMessage("");


      setForm(
        createEmptyForm(
          OBJECT_CONFIG[newObject]
        )
      );

    };


  /*
  ====================================================
  INPUT CHANGE
  ====================================================
  */

  const handleChange =
    (event) => {

      const {
        name,
        value
      } = event.target;


      setForm(
        previousForm => ({

          ...previousForm,

          [name]: value

        })
      );

    };


  /*
  ====================================================
  VALIDATE FORM
  ====================================================
  */

  const validateForm =
    () => {

      for (
        const field
        of config.required
      ) {

        const value =
          form[field];


        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {

          setMessage(
            `${field} is required.`
          );

          return false;

        }

      }


      return true;

    };


  /*
  ====================================================
  CREATE RECORD
  ====================================================
  */

  const createRecord =
    async (event) => {

      event.preventDefault();


      if (
        !validateForm()
      ) {

        return;

      }


      try {

        setLoading(true);

        setMessage("");


        const response =
          await axios.post(

            `${API_URL}/api/${selectedObject}`,

            form

          );


        if (
          response.data.success
        ) {

          setMessage(
            `${config.label} created successfully.`
          );


          resetForm();


          /*
          ------------------------------------------
          REFRESH FROM PAGE 1
          ------------------------------------------
          */

          setCurrentPage(1);

          setTotalPages(1);

          setTotalRecords(0);

          setRecords([]);


          await fetchRecords(
            1,
            false
          );


        } else {

          setMessage(
            response.data.error ||
            `Failed to create ${config.label}.`
          );

        }


      } catch (error) {

        console.error(
          "Create error:",
          error
        );


        setMessage(
          error.response?.data?.error ||
          `Failed to create ${config.label}.`
        );


      } finally {

        setLoading(false);

      }

    };


  /*
  ====================================================
  START EDIT
  ====================================================
  */

  const startEdit =
    (record) => {

      const newForm = {};


      config.fields.forEach(
        (field) => {

          newForm[field] =
            record[field] || "";

        }
      );


      setForm(
        newForm
      );


      setEditingId(
        record.Id
      );


      setViewingRecord(
        null
      );


      setMessage("");


      window.scrollTo({

        top: 0,

        behavior: "smooth"

      });

    };


  /*
  ====================================================
  UPDATE RECORD
  ====================================================
  */

  const updateRecord =
    async (event) => {

      event.preventDefault();


      if (
        !validateForm()
      ) {

        return;

      }


      if (!editingId) {

        setMessage(
          "No record selected for update."
        );

        return;

      }


      try {

        setLoading(true);

        setMessage("");


        const response =
          await axios.put(

            `${API_URL}/api/${selectedObject}/${editingId}`,

            form

          );


        if (
          response.data.success
        ) {

          setMessage(
            `${config.label} updated successfully.`
          );


          resetForm();


          /*
          ------------------------------------------
          REFRESH ALL LOADED RECORDS
          ------------------------------------------
          */

          setRecords([]);

          setCurrentPage(1);

          setTotalPages(1);

          setTotalRecords(0);


          await fetchRecords(
            1,
            false
          );


        } else {

          setMessage(
            response.data.error ||
            `Failed to update ${config.label}.`
          );

        }


      } catch (error) {

        console.error(
          "Update error:",
          error
        );


        setMessage(
          error.response?.data?.error ||
          `Failed to update ${config.label}.`
        );


      } finally {

        setLoading(false);

      }

    };


  /*
  ====================================================
  DELETE RECORD
  ====================================================
  */

  const deleteRecord =
    async (id) => {

      const confirmed =
        window.confirm(

          `Are you sure you want to delete this ${config.label.toLowerCase()}?`

        );


      if (!confirmed) {

        return;

      }


      try {

        setLoading(true);

        setMessage("");


        const response =
          await axios.delete(

            `${API_URL}/api/${selectedObject}/${id}`

          );


        if (
          response.data.success
        ) {

          setMessage(
            `${config.label} deleted successfully.`
          );


          if (
            editingId === id
          ) {

            resetForm();

          }


          /*
          ------------------------------------------
          REFRESH FROM PAGE 1
          ------------------------------------------
          */

          setRecords([]);

          setCurrentPage(1);

          setTotalPages(1);

          setTotalRecords(0);


          await fetchRecords(
            1,
            false
          );


        } else {

          setMessage(
            response.data.error ||
            `Failed to delete ${config.label}.`
          );

        }


      } catch (error) {

        console.error(
          "Delete error:",
          error
        );


        setMessage(
          error.response?.data?.error ||
          `Failed to delete ${config.label}.`
        );


      } finally {

        setLoading(false);

      }

    };


  /*
  ====================================================
  VIEW RECORD
  ====================================================
  */

  const viewRecord =
    async (id) => {

      try {

        setMessage("");


        const response =
          await axios.get(

            `${API_URL}/api/${selectedObject}/${id}`

          );


        if (
          response.data.success
        ) {

          setViewingRecord(
            response.data.record
          );

        } else {

          setMessage(
            response.data.error ||
            "Failed to load record."
          );

        }


      } catch (error) {

        console.error(
          "View record error:",
          error
        );


        setMessage(
          error.response?.data?.error ||
          "Failed to load record."
        );

      }

    };


  /*
  ====================================================
  CANCEL EDIT
  ====================================================
  */

  const cancelEdit =
    () => {

      resetForm();

      setMessage("");

    };


  /*
  ====================================================
  INITIAL AUTH CHECK
  ====================================================
  */

  useEffect(() => {

    checkAuthentication();

  }, [
    checkAuthentication
  ]);


  /*
  ====================================================
  FETCH FIRST PAGE AFTER LOGIN / OBJECT CHANGE
  ====================================================
  */

  useEffect(() => {

    if (
      authenticated
    ) {

      setRecords([]);

      setCurrentPage(1);

      setTotalPages(1);

      setTotalRecords(0);

      fetchRecords(
        1,
        false
      );

    }

  }, [

    authenticated,
    selectedObject

  ]);


  /*
  ====================================================
  INPUT TYPE
  ====================================================
  */

  const getInputType =
    (field) => {

      if (
        field === "Email"
      ) {

        return "email";

      }


      if (
        field === "Website"
      ) {

        return "url";

      }


      if (
        field === "Amount"
      ) {

        return "number";

      }


      if (
        field === "CloseDate"
      ) {

        return "date";

      }


      return "text";

    };


  /*
  ====================================================
  RENDER INPUT
  ====================================================
  */

  const renderInput =
    (field) => {

      const isRequired =
        config.required.includes(
          field
        );


      return (

        <div
          className="form-group"
          key={field}
        >

          <label>

            {field}

            {isRequired && " *"}

          </label>


          <input

            type={
              getInputType(field)
            }

            name={field}

            value={
              form[field] || ""
            }

            placeholder={
              `Enter ${field}`
            }

            onChange={
              handleChange
            }

            required={
              isRequired
            }

          />

        </div>

      );

    };


  /*
  ====================================================
  RENDER
  ====================================================
  */

  return (

    <div className="app">


      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="header">

        <div>

          <h1>
            CloudVandana CRUD
          </h1>

          <p>
            Salesforce Account Management
          </p>

        </div>


        <div>

          {!authenticated ? (

            <button

              className="login-button"

              onClick={
                loginSalesforce
              }

              disabled={
                authChecking
              }

            >

              Login with Salesforce

            </button>

          ) : (

            <button

              className="login-button"

              onClick={
                logoutSalesforce
              }

            >

              Logout

            </button>

          )}

        </div>

      </header>


      <main className="container">


        {/* ========================================
            AUTH CHECK
        ======================================== */}

        {authChecking && (

          <div className="message">

            Checking Salesforce authentication...

          </div>

        )}


        {/* ========================================
            LOGIN MESSAGE
        ======================================== */}

        {!authChecking &&
        !authenticated && (

          <div className="message">

            Please authenticate with Salesforce first.

            <br />

            Click

            <strong>
              {" Login with Salesforce "}
            </strong>

            to continue.

          </div>

        )}


        {/* ========================================
            OBJECT SELECTOR
        ======================================== */}

        {authenticated && (

          <section className="card">

            <h2>
              Salesforce Object
            </h2>


            <div className="form-group">

              <label>
                Select Object
              </label>


              <select

                value={
                  selectedObject
                }

                onChange={
                  handleObjectChange
                }

              >

                {Object.entries(
                  OBJECT_CONFIG
                ).map(
                  ([
                    key,
                    objectConfig
                  ]) => (

                    <option
                      key={key}
                      value={key}
                    >

                      {
                        objectConfig.label
                      }

                    </option>

                  )
                )}

              </select>

            </div>

          </section>

        )}


        {/* ========================================
            MESSAGE
        ======================================== */}

        {message && (

          <div className="message">

            {message}

          </div>

        )}


        {/* ========================================
            CREATE / UPDATE FORM
        ======================================== */}

        {authenticated && (

          <section className="card">

            <h2>

              {editingId

                ? `Update ${config.label}`

                : `Create ${config.label}`

              }

            </h2>


            <form

              onSubmit={
                editingId
                  ? updateRecord
                  : createRecord
              }

            >

              <div className="form-grid">

                {config.fields.map(
                  renderInput
                )}

              </div>


              <div className="form-buttons">

                <button

                  type="submit"

                  className="primary-button"

                  disabled={
                    loading
                  }

                >

                  {editingId

                    ? `Update ${config.label}`

                    : `Create ${config.label}`

                  }

                </button>


                {editingId && (

                  <button

                    type="button"

                    className="cancel-button"

                    onClick={
                      cancelEdit
                    }

                  >

                    Cancel

                  </button>

                )}

              </div>

            </form>

          </section>

        )}


        {/* ========================================
            RECORD TABLE
        ======================================== */}

        {authenticated && (

          <section className="card">


            <div className="section-header">

              <div>

                <h2>

                  Salesforce {

                    config.pluralLabel

                  }

                </h2>


                {totalRecords > 0 && (

                  <p className="record-summary">

                    Showing{" "}

                    1

                    {" - "}

                    {Math.min(
                      records.length,
                      totalRecords
                    )}

                    {" of "}

                    {totalRecords}

                    {" records"}

                  </p>

                )}

              </div>


              <button

                className="refresh-button"

                onClick={() => {

                  setRecords([]);

                  setCurrentPage(1);

                  setTotalPages(1);

                  setTotalRecords(0);

                  fetchRecords(
                    1,
                    false
                  );

                }}

                disabled={
                  loading
                }

              >

                Refresh

              </button>

            </div>


            {/* ====================================
                INITIAL LOADING
            ==================================== */}

            {loading &&
            records.length === 0 ? (

              <p className="loading">

                Loading {

                  config.pluralLabel
                    .toLowerCase()

                }...

              </p>

            ) : records.length === 0 ? (

              <p className="empty">

                No {

                  config.pluralLabel
                    .toLowerCase()

                } found.

              </p>

            ) : (

              <div className="table-container">

                <table>

                  <thead>

                    <tr>

                      {config.fields.map(
                        (field) => (

                          <th
                            key={field}
                          >

                            {field}

                          </th>

                        )
                      )}


                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {records.map(
                      (record) => (

                        <tr
                          key={
                            record.Id
                          }
                        >

                          {config.fields.map(
                            (field) => (

                              <td
                                key={
                                  field
                                }
                              >

                                {
                                  record[field] ||
                                  "-"
                                }

                              </td>

                            )
                          )}


                          <td
                            className="actions"
                          >

                            <button

                              className="edit-button"

                              onClick={() =>
                                viewRecord(
                                  record.Id
                                )
                              }

                            >

                              View

                            </button>


                            <button

                              className="edit-button"

                              onClick={() =>
                                startEdit(
                                  record
                                )
                              }

                            >

                              Edit

                            </button>


                            <button

                              className="delete-button"

                              onClick={() =>
                                deleteRecord(
                                  record.Id
                                )
                              }

                            >

                              Delete

                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}


            {/* ====================================
                LOAD MORE / SCROLL STATUS
            ==================================== */}

            {records.length > 0 && (

              <div className="pagination">


                {currentPage < totalPages ? (

                  <>

                    <p className="page-info">

                      Showing{" "}

                      <strong>
                        {records.length}
                      </strong>

                      {" "}of{" "}

                      <strong>
                        {totalRecords}
                      </strong>

                      {" records"}

                    </p>


                    {loading ? (

                      <p className="loading">

                        Loading next 20 records...

                      </p>

                    ) : (

                      <p className="page-info">

                        Scroll down to load the next 20 records.

                      </p>

                    )}

                  </>

                ) : (

                  <p className="page-info">

                    All{" "}

                    <strong>
                      {totalRecords}
                    </strong>

                    {" records loaded."}

                  </p>

                )}


                {records.length > 20 && (

                  <button

                    className="pagination-button"

                    onClick={
                      scrollToTop
                    }

                  >

                    Back to Top

                  </button>

                )}

              </div>

            )}

          </section>

        )}

      </main>


      {/* ========================================
          VIEW RECORD MODAL
      ======================================== */}

      {viewingRecord && (

        <div

          className="modal-overlay"

          onClick={() =>
            setViewingRecord(
              null
            )
          }

        >

          <div

            className="modal"

            onClick={(event) =>
              event.stopPropagation()
            }

          >


            <div
              className="modal-header"
            >

              <h2>

                {config.label} Details

              </h2>


              <button

                className="modal-close"

                onClick={() =>
                  setViewingRecord(
                    null
                  )
                }

              >

                X

              </button>

            </div>


            <div className="details">


              <div
                className="detail-row"
              >

                <strong>
                  ID
                </strong>


                <span>

                  {
                    viewingRecord.Id
                  }

                </span>

              </div>


              {config.fields.map(
                (field) => (

                  <div

                    className="detail-row"

                    key={field}

                  >

                    <strong>
                      {field}
                    </strong>


                    <span>

                      {
                        viewingRecord[field] ||
                        "-"
                      }

                    </span>

                  </div>

                )
              )}

            </div>


            <div
              className="modal-actions"
            >


              <button

                className="edit-button"

                onClick={() => {

                  startEdit(
                    viewingRecord
                  );

                  setViewingRecord(
                    null
                  );

                }}

              >

                Edit

              </button>


              <button

                className="cancel-button"

                onClick={() =>
                  setViewingRecord(
                    null
                  )
                }

              >

                Close

              </button>

            </div>


          </div>

        </div>

      )}

    </div>

  );

}


/*
======================================================
START REACT
======================================================
*/

createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

    <App />

  </React.StrictMode>

);