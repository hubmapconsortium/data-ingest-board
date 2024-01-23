export function eq(s1, s2, insensitive = true) {
    let res = s1 === s2
    if (insensitive && s1 !== undefined && s2 !== undefined) {
        res = s1.toLowerCase() === s2.toLowerCase()
    }
    return res
}

String.prototype.format = function() {
    let args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match
            ;
    });
};

export const getUBKGName = (o) => {
    if (!window.UBKG) return o
    let organTypes = window.UBKG?.organTypes
    for (let organ of organTypes) {
        if (organ.rui_code === o) {
            return organ.term
        }
    }
    return o
}

export const getRequestOptions = () => {
    return {
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

export const getHeadersWith = (value, key = 'Authorization') => {
    const options = getRequestOptions()
    options.headers[key] = `Bearer ${value}`
    return options
}

export const parseJSON = (obj) => {
    try {
        return JSON.parse(obj)
    } catch (e) {
        console.error(e)
    }
    return {}
}

export const storageKey = (key = '') => `ingest-board.${key}`

export const deleteFromLocalStorage = (needle, fn = 'startsWith') => {
    Object.keys(localStorage)
        .filter(x =>
            x[fn](needle))
        .forEach(x =>
            localStorage.removeItem(x))
}

export const ENVS = {
    ubkg: {
        base: () => process.env.NEXT_PUBLIC_UBKG_BASE,
        sab: () => process.env.NEXT_PUBLIC_APP_CONTEXT
    },
    theme: () => parseJSON(process.env.NEXT_PUBLIC_THEME),
    locale: () => {
        return process.env.NEXT_PUBLIC_LOCALE || 'en/hubmap'
    },
    appContext: () => {
        return process.env.NEXT_PUBLIC_APP_CONTEXT || 'Hubmap'
    },
    urlFormat: {
        portal: (path) => `${process.env.NEXT_PUBLIC_PORTAL_BASE}${path}`,
        ingest: {
            be: (path) => `${process.env.NEXT_PUBLIC_API_BASE}${path}`,
            fe: (path) => `${process.env.NEXT_PUBLIC_INGEST_BASE}${path}`,
        }
    },
    tableColumns: () => parseJSON(process.env.NEXT_PUBLIC_TABLE_COLUMNS),
    filterFields: () => parseJSON(process.env.NEXT_PUBLIC_FILTER_FIELDS),
    defaultFilterFields: () => parseJSON(process.env.NEXT_PUBLIC_DEFAULT_FILTER_FIELDS),
    excludeTableColumns: ()=> {
        let cols = parseJSON(process.env.NEXT_PUBLIC_EXCLUDE_TABLE_COLUMNS)
        const dict = {}
        for (let col of cols) {
            dict[col] = true
        }
        return dict
    },
    uploadsEnabled: () => process.env.NEXT_PUBLIC_UPLOADS_ENABLED === '1',
    searchEnabled: () => process.env.NEXT_PUBLIC_SEARCH_ENABLED === '1',
    searchIndices: (entity) => {
        const config = parseJSON(process.env.NEXT_PUBLIC_SEARCH_INDICES)
        return config[entity]
    },
    idleTimeout: () => {
        let num = process.env.NEXT_PUBLIC_IDLE_TIME
        try {
            num = Number(num) || 1000
        } catch (e) {}
        return num * 60 * 60
    },
    cookieDomain: () => process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    groupName: () => process.env.NEXT_PUBLIC_PRIVS_GROUP_NAME,
}

let THEME_CONFIG
export const THEME = {
    cssProps: () => {
        const themeConfig = ENVS.theme()
        for (let t in themeConfig.cssProps) {
            document.body.style.setProperty(
                `--${t}`,
                `${themeConfig.cssProps[t]}`
            );
        }
        document.documentElement.classList.add(`theme--${themeConfig.theme || 'dark'}`)
    },
    getStatusColor: (status) => {
        status = status.toLowerCase()
        if (!THEME_CONFIG) {
            // Store this to avoid constantly parsing during table build
            THEME_CONFIG = ENVS.theme()
        }
        const statusColors = THEME_CONFIG.statusColors || {}
        const colors =  statusColors[status]?.split(':')
        const bg = colors ? colors[0] : (statusColors.default || 'darkgrey')
        const text = colors && colors.length > 1 ? colors[1] : 'white'
        return {bg, text}
    }
}

export const TABLE = {
    cols: {
        n: (k, n) => {
            const cols = ENVS.tableColumns()
            return cols[k]?.name || n || k
        },
        f: (k) => {
            const cols = ENVS.tableColumns()
            return cols[k]?.field || k
        }
    },
    getStatusDefinition: (status, entityType = 'Dataset') => {
        let msg
        if (status) {
            status = status.toUpperCase();
            switch(status) {
                case 'NEW':
                    msg = <span>The data provider has begun to upload data but is not ready for validation or processing via the ingest pipeline.</span>
                    break;
                case 'INVALID':
                    msg = <span>The data did not pass validation prior to processing via the ingest pipeline.</span>
                    break;
                case 'QA':
                    msg = <span>The data has been successfully processed via the ingest pipeline and is awaiting data provider curation.</span>
                    break;
                case 'ERROR':
                    msg = <span>An error occurred during processing via the ingest pipeline.</span>
                    break;
                case 'PROCESSING':
                    msg = <span>The data is currently being processed via the ingest pipeline.</span>
                    break;
                case 'REORGANIZED':
                    msg = <span>Datasets included in this <code>Upload</code> have been registered and data has been reorganized on the Globus Research Management system.</span>
                    break;
                case 'SUBMITTED':
                    msg = <span>The data provider has finished uploading data and the data is ready for validation.</span>
                    break;
                case 'PUBLISHED':
                    msg = <span>The data has been successfully curated and released for public use.</span>
                    break;
                default:
                    msg = <span>The <code>{entityType}</code> has been {status}.</span>
                    break;
            }
        }
        return msg;
    },
    getStatusFilters: (entityTypeFilters) => {
        const filters = [
            {text: 'Error', value: 'Error'},
            {text: 'Invalid', value: 'Invalid'},
            {text: 'New', value: 'New'},
            {text: 'Processing', value: 'Processing'},
            {text: 'Submitted', value: 'Submitted'},
        ]
        return filters.concat(entityTypeFilters)
    }
}

export const URLS = {
    portal: {
      main: () => process.env.NEXT_PUBLIC_PORTAL_BASE,
      view: (uuid, entity = 'dataset')  => {
          let path = process.env.NEXT_PUBLIC_PORTAL_VIEW_PATH.format(entity, uuid)
          return ENVS.urlFormat.portal(path)
      }
    },
    ingest: {
        data: {
          datasets: () => process.env.NEXT_PUBLIC_DATASET_URL,
          uploads: () => process.env.NEXT_PUBLIC_UPLOAD_URL
        },
        main: () => process.env.NEXT_PUBLIC_INGEST_BASE,
        view: (uuid, entity = 'dataset') => {
            let path = process.env.NEXT_PUBLIC_INGEST_VIEW_PATH.format(entity, uuid)
            return ENVS.urlFormat.ingest.fe(path)
        },
        privs: {
            groups: () => process.env.NEXT_PUBLIC_PRIVS_GROUP_URL
        },
        auth: {
          login: () => ENVS.urlFormat.ingest.be('/data-ingest-board-login'),
          logout: () => ENVS.urlFormat.ingest.be('/data-ingest-board-logout')
        }
    }
}