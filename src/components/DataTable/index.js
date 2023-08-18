import React, { useState, useEffect } from "react";
import axios from "axios";
import UploadTable from "./UploadTable";
import DatasetTable from "./DatasetTable";
import {ENVS, getHeadersWith} from "../../service/helper";


const DataTable = (props) => {
    const [datasetData, setDatasetData] = useState([]);
    const [datasetCount, setDatasetCount] = useState(0);
    const [uploadCount, setUploadCount] = useState(0);
    const [uploadData, setUploadData] = useState([]);
    const [primaryData, setPrimaryData] = useState([]);
    const [originalPrimaryData, setOriginalPrimaryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [useDatasetApi, setUseDatasetApi] = useState(props.entityType !== 'uploads');
    const [selectUploadId, setSelectUploadId] = useState(props.selectUploadId);
    const [invalidUploadId, setInvalidUploadId] = useState(false);
    const [page, setPage] = useState(props.initialPage);
    const [pageSize, setPageSize] = useState(props.pageSize !== undefined ? props.pageSize : 10);
    const [sortField, setSortField] = useState(props.sortField);
    const [sortOrder, setSortOrder] = useState(props.sortOrder);
    const [filters, setFilters] = useState(props.tableFilters);
    const [globusToken, setGlobusToken] = useState(props.globusToken);
    const [tableKey, setTableKey] = useState('initialKey');
    const datasetUrl = process.env.NEXT_PUBLIC_DATASET_URL;
    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL;

    useEffect(() => {
        loadData();
    }, []);

    const handleTableChange = (pagination, filters, sorter, { currentDataSource }) => {
        setPage(pagination.current)
        setPageSize(pagination.pageSize)
        let correctedFilters = {};
        for (let filter in filters) {
            if (filters[filter]) {
                correctedFilters[filter] = filters[filter];
            }
        }

        for (let correctedFilter in correctedFilters){
            if (Array.isArray(correctedFilters[correctedFilter])){
                correctedFilters[correctedFilter] = correctedFilters[correctedFilter].join(',');
            }
        }
        setFilters(correctedFilters);

        if (useDatasetApi) {
            const filteredDatasets = currentDataSource || [];
            setDatasetCount(filteredDatasets.length)
        } else {
            const filteredUploads = currentDataSource || [];
            setUploadCount(filteredUploads.length);
        }

        const query = new URLSearchParams(window.location.search);
        if (sorter.field) {
            query.set('sort_field', sorter.field);
            if (sorter.order) {
                query.set('sort_order', sorter.order);
            } else {
                query.delete('sort_field');
                query.delete('sort_order');
            }
        } else {
            query.delete('sort_field');
            query.delete('sort_order');
        }
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                query.set(key, filters[key].join(','));
            } else {
                query.delete(key);
            }
        });
        if (pagination.current && pagination.current !== 1) {
            query.set('page', pagination.current);
        } else {
            query.delete('page');
        }
        if (pagination.pageSize && pagination.pageSize !== 10) {
            query.set('page_size', pagination.pageSize);
        } else {
            query.delete('page_size');
        }
        window.history.pushState(null, null, `?${query.toString()}`);
    }

    const filterUploads = (uploadResponse, datasetResponse, uploadId) => {
        if (typeof uploadId !== 'undefined') {
            const matchingUpload = uploadResponse.find(upload => upload.uuid === uploadId || upload.hubmap_id === uploadId);
            if (typeof matchingUpload !== 'undefined') {
                const datasetsInUpload = matchingUpload.datasets;
                const listOfDatasets = datasetsInUpload.split(',').map(item => item.trim());
                const filteredDatasets = datasetResponse.filter((dataset) => listOfDatasets.includes(dataset.uuid));
                setPrimaryData(filteredDatasets);
                setSelectUploadId(uploadId);
                setUseDatasetApi(true);
                setInvalidUploadId(false);
                window.history.pushState(null, null, `/?upload_id=${uploadId}`)
            }
            else if (typeof matchingUpload === 'undefined') {
                setInvalidUploadId(true);
            }
        }
    }

    const getPrimaryDatasets = (dataResponse) => {
        return dataResponse.filter(dataset => dataset.is_primary === "true");
    }

    const addDescendants = (datasetResponse) => {
        return datasetResponse.map(dataset => {
            const descendantsArray = dataset.descendant_datasets ? dataset.descendant_datasets.split(",") : [];
            let descendant = "";
            if (descendantsArray.length === 1) {
                descendant = descendantsArray[0];
            } else if (descendantsArray.length > 1) {
                descendant = descendantsArray.length.toString();
            }
            return {
                ...dataset,
                descendants: descendant
            };
        });
    }

    const loadData = async () => {
        setLoading(true);
        const options = getHeadersWith(globusToken)
        try {
            const datasetResponse = await axios.get(datasetUrl, options);

            let uploadData = []
            if (ENVS.uploadsEnabled()) {
                const uploadResponse = await axios.get(uploadUrl, options);
                setUploadCount(uploadResponse.data.length);
                setUploadData(uploadResponse.data);
                uploadData = uploadResponse.data
            }

            const datasetsWithDescendants = addDescendants(datasetResponse.data);
            const primaryDatasets = getPrimaryDatasets(datasetsWithDescendants);
            setDatasetData(datasetsWithDescendants);
            setDatasetCount(primaryDatasets.length);
            setPrimaryData(primaryDatasets);
            setOriginalPrimaryData(primaryDatasets);

            filterUploads(uploadData, datasetResponse.data, selectUploadId);
        } catch (error) {
        } finally {
        setLoading(false);
        }
    };

    const toggleHistory = (condition) => {
        if (condition) {
            window.history.pushState(null, null, `/?entity_type=uploads`)
        } else {
            window.history.pushState(null, null, `/`)
        }
    }

    const toggleApi = () => {
        setInvalidUploadId(false);
        setUseDatasetApi(!useDatasetApi);
        toggleHistory(useDatasetApi)
        setFilters({});
        setSortField(undefined);
        setSortOrder(undefined);
        setPage(1);
        setPageSize( 10);
        setDatasetCount(primaryData.length);
        setUploadCount(uploadData.length);
    };

    const clearAll = () => {
        setInvalidUploadId(false);
        toggleHistory(!useDatasetApi)
        setPrimaryData(originalPrimaryData);
        setFilters({});
        setSortField(undefined);
        setSortOrder(undefined);
        setPage(1);
        setPageSize( 10);
        setDatasetCount(primaryData.length);
        setUploadCount(uploadData.length);
        setTableKey(prevKey => prevKey === 'initialKey' ? 'updatedKey' : 'initialKey');

    };

    const uploadTable = ENVS.uploadsEnabled() ? (
        <UploadTable
            key={tableKey}
            data={uploadData}
            loading={loading}
            filterUploads={filterUploads}
            uploadData={uploadData}
            datasetData={originalPrimaryData}
            handleTableChange={handleTableChange}
            page={page}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            filters={filters}
        />
    ) : (<></>)

    const table = useDatasetApi ? (
        <DatasetTable
            key={tableKey}
            data={primaryData}
            loading={loading}
            handleTableChange={handleTableChange}
            page={page}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            filters={filters}
        />
    ) : uploadTable;

    return (
        <div className="c-table c-table--data container">
            <div className="row">
                <h2 className="c-table__title col text-center m-3">
                    {useDatasetApi ? "Datasets" : "Uploads"}
                </h2>
            </div>
            {invalidUploadId && <p style={{ color: "red" }}>Upload ID Not Found</p>}
            <div className="c-table__btns mx-auto text-center">
                {ENVS.uploadsEnabled() && <button className="c-btn c-btn--primary col-md-6 col-lg-3" onClick={toggleApi}>
                    {useDatasetApi ? "SWITCH TO UPLOADS" : 'SWITCH TO DATASETS'}
                </button>}
                <button className="c-btn c-btn--lgt col-md-6 col-lg-3" onClick={clearAll}>
                    {"CLEAR"}
                </button>
            </div>
            {table}
        </div>
    )
}

export default DataTable

